import type { Metadata } from 'next';
import Link from 'next/link';
import { formatRecordValue, formatScore } from '@garfit/domain';
import type { WorkoutDetail } from '@garfit/types';
import { WORKOUT_STATUS_LABELS, WORKOUT_TYPE_LABELS } from '@garfit/validation';
import { removeWorkout, startWorkout } from '@/app/workout-actions';
import { WorkoutResultsForm } from '@/components/workout-results-form';
import { serverApi } from '@/lib/auth';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const workout = await serverApi().workouts.get(id);
    return { title: workout.name };
  } catch {
    return { title: 'Detalle de entrenamiento' };
  }
}

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
  const aiAvailable =
    completed &&
    (await serverApi()
      .ai.status()
      .then((status) => status.enabled && status.configured)
      .catch(() => false));

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <Link className="text-sm font-semibold text-accent hover:underline" href="/app/workouts">
        ← Volver a entrenamientos
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            {completed ? 'Entrenamiento completado: ' : ''}
            {workout.name}
          </h1>
          <span className="rounded-full border border-line bg-raised px-2.5 py-0.5 text-xs font-semibold text-muted">
            {WORKOUT_STATUS_LABELS[workout.status]}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">
          {WORKOUT_TYPE_LABELS[workout.workoutType]} · {workout.exercises.length} ejercicios
        </p>
      </div>

      {notice === 'not-editable' && (
        <div className="rounded-[10px] border border-danger/30 bg-danger/15 p-3 text-sm text-danger" role="alert">
          Sólo se pueden editar borradores.
        </div>
      )}

      {workout.headline && (
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-lg font-bold text-metric">{workout.headline}</p>
        </div>
      )}

      {completed ? (
        <>
          <Completed workout={workout} />
          {aiAvailable && (
            <div>
              <Link
                className="btn-secondary"
                href={`/app/ai?workoutId=${workout.id}`}
              >
                Analizar entrenamiento con IA
              </Link>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-bold text-ink">Ejercicios prescritos</h2>
            <ul className="mt-3 space-y-2">
              {workout.exercises.map((exercise) => (
                <li
                  key={exercise.id}
                  className="flex items-center justify-between rounded-[10px] border border-line bg-raised/50 p-3 text-sm"
                >
                  <span className="font-semibold text-ink">{exercise.movement.name}</span>
                  <span className="text-muted">
                    {exercise.targetSets ?? 0} series × {exercise.targetReps ?? 0} reps
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {workout.status === 'DRAFT' && (
            <div className="flex flex-wrap items-center gap-3">
              <Link className="btn-secondary" href={`/app/workouts/${id}/edit`}>
                Editar
              </Link>
              <form action={startWorkout}>
                <input name="id" type="hidden" value={id} />
                <button type="submit" className="btn-primary">
                  Empezar entrenamiento
                </button>
              </form>
            </div>
          )}

          {workout.status === 'IN_PROGRESS' && <WorkoutResultsForm workout={workout} />}
        </>
      )}

      <div className="border-t border-line pt-4">
        {confirm === 'delete' ? (
          <form action={removeWorkout} className="flex items-center gap-3">
            <input name="id" type="hidden" value={id} />
            <span className="text-sm text-danger">¿Eliminar este entrenamiento?</span>
            <button
              type="submit"
              className="rounded-[10px] border border-danger/30 bg-danger/15 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/25"
            >
              Sí, eliminar
            </button>
            <Link className="text-xs text-muted hover:text-ink" href={`/app/workouts/${id}`}>
              Cancelar
            </Link>
          </form>
        ) : (
          <Link
            className="text-xs text-muted hover:text-danger hover:underline"
            href={`/app/workouts/${id}?confirm=delete`}
          >
            Eliminar entrenamiento
          </Link>
        )}
      </div>
    </section>
  );
}

function Completed({ workout }: { workout: WorkoutDetail }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 space-y-4">
      <h2 className="text-base font-bold text-ink">Resultados registrados</h2>
      {workout.score && (
        <p className="text-sm text-metric font-semibold">
          Resultado final: {formatScore(workout.workoutType, workout.score)}
        </p>
      )}
      <div className="space-y-4">
        {workout.exercises.map((exercise) => (
          <div key={exercise.id} className="rounded-[10px] border border-line bg-raised/40 p-4">
            <h3 className="font-bold text-ink">{exercise.movement.name}</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {exercise.results.map((result) => (
                <li key={result.setNumber} className="flex items-center gap-2">
                  <span>Serie {result.setNumber}:</span>
                  <span className="font-medium text-ink">
                    {result.reps ? `${result.reps} reps` : ''}
                    {result.loadValue && result.loadUnit
                      ? ` @ ${formatRecordValue('WEIGHT', result.loadValue, result.loadUnit)}`
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
