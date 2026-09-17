import Link from 'next/link';
import { formatRecordValue, formatScore } from '@garfit/domain';
import type { WorkoutDetail } from '@garfit/types';
import { WORKOUT_STATUS_LABELS, WORKOUT_TYPE_LABELS } from '@garfit/validation';
import { removeWorkout, startWorkout } from '@/app/workout-actions';
import { WorkoutResultsForm } from '@/components/workout-results-form';
import { serverApi } from '@/lib/auth';
export default async function WorkoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ confirm?: string; notice?: string }>;
}) {
  const { id } = await params;
  const { confirm, notice } = await searchParams;
  const workout = await serverApi().workouts.get(id);
  const completed = workout.status === 'COMPLETED';
  return (
    <section className="mx-auto max-w-4xl">
      <Link className="underline" href="/app/workouts">
        Volver a entrenamientos
      </Link>
      <h1 className="mt-4 text-3xl font-bold">
        {completed ? 'Entrenamiento completado: ' : ''}
        {workout.name}
      </h1>
      <p>
        {WORKOUT_TYPE_LABELS[workout.workoutType]} · {WORKOUT_STATUS_LABELS[workout.status]}
      </p>
      {notice === 'not-editable' && <p role="alert">Sólo se pueden editar borradores.</p>}
      {workout.headline && <p className="mt-2 text-xl">{workout.headline}</p>}
      {completed ? (
        <Completed workout={workout} />
      ) : (
        <>
          <ul className="mt-5 space-y-2">
            {workout.exercises.map((exercise) => (
              <li key={exercise.id}>
                {exercise.movement.name} · {exercise.targetSets ?? 0} series ×{' '}
                {exercise.targetReps ?? 0} reps
              </li>
            ))}
          </ul>
          {workout.status === 'DRAFT' && (
            <div className="mt-5 flex gap-3">
              <Link className="underline" href={`/app/workouts/${id}/edit`}>
                Editar
              </Link>
              <form action={startWorkout}>
                <input name="id" type="hidden" value={id} />
                <button className="rounded-lg bg-brand px-4 py-2 text-white">Empezar</button>
              </form>
            </div>
          )}
          <WorkoutResultsForm workout={workout} />
        </>
      )}
      <form action={removeWorkout} className="mt-8">
        <input name="id" type="hidden" value={id} />
        {confirm === 'delete' ? (
          <>
            <p>Al borrar se retirarán sus marcas derivadas. Esta acción no se puede deshacer.</p>
            <button className="text-red-700 underline">Confirmar borrado</button>
          </>
        ) : (
          <Link className="text-red-700 underline" href={`/app/workouts/${id}?confirm=delete`}>
            Borrar entrenamiento
          </Link>
        )}
      </form>
    </section>
  );
}
function Completed({
  workout,
}: {
  workout: Awaited<ReturnType<ReturnType<typeof serverApi>['workouts']['get']>>;
}) {
  return (
    <>
      <ul className="mt-6 space-y-3">
        {workout.exercises.map((exercise) => (
          <li className="rounded-xl border border-line p-4" key={exercise.id}>
            <h2 className="font-semibold">{exercise.movement.name}</h2>
            {exercise.results.map((set) => (
              <p key={set.id}>
                Serie {set.setNumber} ·{' '}
                {[
                  set.reps && `${set.reps} reps`,
                  set.loadKg && formatRecordValue('WEIGHT', set.loadKg),
                  set.distanceMeters && formatRecordValue('DISTANCE', set.distanceMeters),
                  set.durationSeconds && formatRecordValue('DURATION', set.durationSeconds),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ))}
          </li>
        ))}
      </ul>
      {workout.score && (
        <p className="mt-4">Score: {formatScore(workout.workoutType, workout.score)}</p>
      )}
      <p>Volumen total: {formatRecordValue('WEIGHT', workout.volumeKg)}</p>
      <section className="mt-5">
        <h2 className="font-bold">
          {workout.personalRecords.length
            ? `${workout.personalRecords.length} marcas personales`
            : 'Sin marcas nuevas esta vez'}
        </h2>
        {workout.personalRecords.map((item) => (
          <Link
            className="block underline"
            href={`/app/records/${item.record.movement.slug}`}
            key={item.record.id}
          >
            {item.previousBest === null ? 'Primera marca' : personalRecordText(item)}
          </Link>
        ))}
      </section>
    </>
  );
}

function personalRecordText(item: WorkoutDetail['personalRecords'][number]) {
  const before = formatRecordValue(item.record.recordType, item.previousBest ?? 0);
  const after = formatRecordValue(item.record.recordType, item.record.normalizedValue);
  const change = item.change
    ? ` · +${formatRecordValue(item.record.recordType, Math.abs(item.change.absolute))}`
    : '';
  return `${before} → ${after}${change}`;
}
