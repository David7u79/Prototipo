import Link from 'next/link';
import { WORKOUT_TYPE_LABELS } from '@garfit/validation';
import { serverApi } from '@/lib/auth';
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
    <section className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">WODs</h1>
        <Link className="rounded-lg bg-brand px-4 py-2 text-white" href="/app/wods/new">
          Nuevo WOD
        </Link>
      </div>
      <form className="mt-5 flex gap-2">
        <input defaultValue={q.search} name="search" placeholder="Buscar WOD" />
        <select defaultValue={q.workoutType} name="workoutType">
          <option value="">Todos los tipos</option>
          {Object.entries(WORKOUT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button>Buscar</button>
      </form>
      <ul className="mt-6 space-y-3">
        {items.map((wod) => (
          <li className="rounded-xl border border-line p-4" key={wod.id}>
            <Link className="font-semibold underline" href={`/app/wods/${wod.slug}`}>
              {wod.name}
            </Link>
            <p>
              {WORKOUT_TYPE_LABELS[wod.workoutType]} · {wod.exerciseCount} ejercicios{' '}
              {wod.isBenchmark ? '· Benchmark' : ''}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
