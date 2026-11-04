import type { Metadata } from 'next';
import Link from 'next/link';
import { WORKOUT_STATUS_LABELS, WORKOUT_TYPE_LABELS } from '@garfit/validation';
import { serverApi } from '@/lib/auth';
import { dateLabel } from '@/lib/workouts';

export const metadata: Metadata = {
  title: 'Entrenamientos',
};

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function WorkoutsPage({ searchParams }: Props) {
  const query = await searchParams;
  const data = await serverApi().workouts.list({
    ...query,
    page: Number(query.page) || 1,
    limit: 20,
  });
  const pending = data.items.filter((item) => item.status !== 'COMPLETED');
  const completed = data.items.filter((item) => item.status === 'COMPLETED');

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Registro personal</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">Entrenamientos</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link className="btn-secondary" href="/app/wods">
            Desde un WOD
          </Link>
          <Link className="btn-primary" href="/app/workouts/new">
            Nuevo entrenamiento
          </Link>
        </div>
      </div>

      <form className="grid gap-2.5 sm:grid-cols-4">
        <select defaultValue={query.workoutType} name="workoutType" aria-label="Tipo de entrenamiento">
          <option value="">Todos los tipos</option>
          {Object.entries(WORKOUT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select defaultValue={query.status} name="status" aria-label="Estado">
          <option value="">Todos los estados</option>
          {Object.entries(WORKOUT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input defaultValue={query.from} name="from" type="date" aria-label="Fecha desde" />
        <button type="submit" className="btn-secondary">
          Filtrar
        </button>
      </form>

      {pending.length > 0 && <WorkoutList items={pending} title="Pendientes" />}
      {completed.length > 0 ? (
        <WorkoutList items={completed} title="Historial" />
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-6 text-center">
          <p className="text-sm text-muted">Aún no hay entrenamientos completados.</p>
        </div>
      )}

      {data.totalPages > 1 && (
        <nav className="mt-5 text-sm text-muted" aria-label="Paginación">
          Página {data.page} de {data.totalPages}
        </nav>
      )}
    </section>
  );
}

function WorkoutList({
  items,
  title,
}: {
  items: Awaited<ReturnType<ReturnType<typeof serverApi>['workouts']['list']>>['items'];
  title: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            className="rounded-2xl border border-line bg-surface p-5 transition hover:border-line/80"
            key={item.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                className="text-lg font-bold text-ink no-underline hover:text-accent"
                href={`/app/workouts/${item.id}`}
              >
                {item.name}
              </Link>
              {item.personalRecordCount > 0 && (
                <span className="rounded-full border border-success/30 bg-success/15 px-2.5 py-0.5 text-xs font-bold text-success">
                  {item.personalRecordCount} {item.personalRecordCount === 1 ? 'marca' : 'marcas'}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">
              {workoutDateOrStatus(item)} · {WORKOUT_TYPE_LABELS[item.workoutType]} ·{' '}
              {item.movements.join(', ')}
            </p>
            {item.headline && (
              <p className="mt-2 text-sm font-medium text-metric">{item.headline}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function workoutDateOrStatus(item: {
  performedOn: string | null;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
}) {
  return item.performedOn ? dateLabel(item.performedOn) : WORKOUT_STATUS_LABELS[item.status];
}
