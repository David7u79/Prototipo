import Link from 'next/link';
import { formatDuration, formatRecordValue } from '@garfit/domain';
import { WORKOUT_TYPE_LABELS } from '@garfit/validation';
import { useWod } from '@/app/workout-actions';
import { serverApi } from '@/lib/auth';
export default async function WodPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const wod = await serverApi().wods.get(slug);
  const aiAvailable = await serverApi()
    .ai.status()
    .then((status) => status.enabled && status.configured)
    .catch(() => false);
  const prescription = [
    wod.repScheme.join('-'),
    wod.rounds && `${wod.rounds} rondas`,
    wod.durationSeconds && formatDuration(wod.durationSeconds),
    WORKOUT_TYPE_LABELS[wod.workoutType],
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <section className="mx-auto max-w-3xl">
      <Link className="underline" href="/app/wods">
        Volver a WODs
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{wod.name}</h1>
      <p className="mt-2">{prescription}</p>
      {wod.description && <p className="mt-3 text-muted">{wod.description}</p>}
      <ul className="mt-6 space-y-2">
        {wod.exercises.map((exercise) => (
          <li className="rounded-xl border border-line p-4" key={exercise.position}>
            {exercise.movement.name} ·{' '}
            {[
              exercise.reps && `${exercise.reps} reps`,
              exercise.loadValue &&
                exercise.loadUnit &&
                formatRecordValue('WEIGHT', exercise.loadValue, exercise.loadUnit),
              exercise.distanceValue &&
                exercise.distanceUnit &&
                formatRecordValue('DISTANCE', exercise.distanceValue, exercise.distanceUnit),
              exercise.durationSeconds && formatDuration(exercise.durationSeconds),
            ]
              .filter(Boolean)
              .join(' · ')}
          </li>
        ))}
      </ul>
      <form action={useWod} className="mt-6">
        <input name="slug" type="hidden" value={wod.slug} />
        <button className="rounded-lg bg-brand px-4 py-2 text-white">Usar este WOD</button>
      </form>
      {aiAvailable && (
        <Link
          className="mt-3 inline-block rounded-lg border border-line px-4 py-2 font-semibold"
          href={`/app/ai?type=wod&slug=${wod.slug}`}
        >
          Explicar WOD
        </Link>
      )}
    </section>
  );
}
