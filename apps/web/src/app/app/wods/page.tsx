import type { Metadata } from 'next';
import Link from 'next/link';
import { WORKOUT_TYPE_LABELS } from '@garfit/validation';
import { serverApi } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'WODs',
};

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function WodsPage({ searchParams }: Props) {
  const q = await searchParams;
  const data = await serverApi().wods.list({
    search: q.search,
    workoutType: q.workoutType as never,
    limit: 50,
  });
  const items = [...data.items].sort((a, b) => Number(b.isBenchmark) - Number(a.isBenchmark));

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Catálogo de entrenamientos</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">WODs</h1>
        </div>
        <Link className="btn-primary" href="/app/wods/new">
          Nuevo WOD
        </Link>
      </div>

      <form className="flex flex-col gap-2.5 sm:flex-row">
        <input
          defaultValue={q.search}
          name="search"
          placeholder="Buscar WOD"
          aria-label="Buscar WOD"
          className="flex-1"
        />
        <select
          defaultValue={q.workoutType}
          name="workoutType"
          aria-label="Tipo de WOD"
          className="sm:w-56"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(WORKOUT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-secondary shrink-0">
          Buscar
        </button>
      </form>

      <ul className="space-y-3">
        {items.map((wod) => (
          <li
            className="rounded-2xl border border-line bg-surface p-5 transition hover:border-line/80"
            key={wod.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                className="text-lg font-bold text-ink no-underline hover:text-accent"
                href={`/app/wods/${wod.slug}`}
              >
                {wod.name}
              </Link>
              {wod.isBenchmark && (
                <span className="rounded-full border border-accent/40 bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">
                  Benchmark
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">
              {WORKOUT_TYPE_LABELS[wod.workoutType]} · {wod.exerciseCount} ejercicios
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
