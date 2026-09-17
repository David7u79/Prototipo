import Link from 'next/link';
import { WORKOUT_STATUS_LABELS, WORKOUT_TYPE_LABELS } from '@garfit/validation';
import { serverApi } from '@/lib/auth';
import { dateLabel } from '@/lib/workouts';

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
    <section className="mx-auto max-w-4xl">
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-brand">Registro personal</p>
          <h1 className="text-3xl font-bold">Entrenamientos</h1>
        </div>
        <div className="flex gap-2">
          <Link className="underline" href="/app/wods">
            Desde un WOD
          </Link>
          <Link className="rounded-lg bg-brand px-4 py-2 text-white" href="/app/workouts/new">
            Nuevo entrenamiento
          </Link>
        </div>
      </div>
      <form className="mt-5 grid gap-2 sm:grid-cols-4">
        <select defaultValue={query.workoutType} name="workoutType">
          <option value="">Todos los tipos</option>
          {Object.entries(WORKOUT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select defaultValue={query.status} name="status">
          <option value="">Todos los estados</option>
          {Object.entries(WORKOUT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input defaultValue={query.from} name="from" type="date" />
        <button>Filtrar</button>
      </form>
      {pending.length > 0 && <WorkoutList items={pending} title="Pendientes" />}
      {completed.length > 0 ? (
        <WorkoutList items={completed} title="Historial" />
      ) : (
        <p className="mt-6 text-muted">Aún no hay entrenamientos completados.</p>
      )}
      {data.totalPages > 1 && (
        <nav className="mt-5" aria-label="Paginación">
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
    <section className="mt-6">
      <h2 className="text-xl font-bold">{title}</h2>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li className="rounded-xl border border-line bg-panel p-4" key={item.id}>
            <Link className="font-semibold underline" href={`/app/workouts/${item.id}`}>
              {item.name}
            </Link>
            <p className="text-sm text-muted">
              {workoutDateOrStatus(item)} · {WORKOUT_TYPE_LABELS[item.workoutType]} ·{' '}
              {item.movements.join(', ')}
            </p>
            {item.headline && <p>{item.headline}</p>}
            {item.personalRecordCount > 0 && <p>{item.personalRecordCount} marcas</p>}
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
