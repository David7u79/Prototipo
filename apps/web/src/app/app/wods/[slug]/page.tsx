import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDuration, formatRecordValue } from '@garfit/domain';
import { WORKOUT_TYPE_LABELS } from '@garfit/validation';
import { useWod } from '@/app/workout-actions';
import { WodPerformance } from '@/components/wod-performance';
import { serverApi } from '@/lib/auth';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const wod = await serverApi().wods.get(slug);
    return { title: wod.name };
  } catch {
    return { title: 'Detalle de WOD' };
  }
}

export default async function WodPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const api = serverApi();
  const [wod, performance] = await Promise.all([api.wods.get(slug), api.wods.performance(slug)]);
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
    <section className="mx-auto max-w-3xl space-y-6">
      <Link className="text-sm font-semibold text-accent hover:underline" href="/app/wods">
        ← Volver a WODs
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">{wod.name}</h1>
          {wod.isBenchmark && (
            <span className="rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
              Benchmark
            </span>
          )}
        </div>
        <p className="mt-2 text-base font-medium text-metric">{prescription}</p>
        {wod.description && <p className="mt-3 text-muted">{wod.description}</p>}
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-base font-bold text-ink">Ejercicios del WOD</h2>
        <ul className="mt-3 space-y-2">
          {wod.exercises.map((exercise) => (
            <li
              className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-line bg-raised/50 p-3 text-sm"
              key={exercise.position}
            >
              <span className="font-semibold text-ink">{exercise.movement.name}</span>
              <span className="text-muted">
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
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form action={useWod}>
          <input name="slug" type="hidden" value={wod.slug} />
          <button type="submit" className="btn-primary">
            Usar este WOD
          </button>
        </form>
        {aiAvailable && (
          <Link
            className="btn-secondary"
            href={`/app/ai?type=wod&slug=${wod.slug}`}
          >
            Explicar WOD con IA
          </Link>
        )}
      </div>

      <WodPerformance performance={performance.performance} />
    </section>
  );
}
