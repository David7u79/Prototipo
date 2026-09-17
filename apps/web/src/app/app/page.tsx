import Link from 'next/link';
import { ApiError } from '@garfit/api-client';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/auth';
import { formatChange, formatValue } from '@/lib/records';

async function dashboardData() {
  try {
    const api = serverApi();
    return await Promise.all([
      api.auth.me(),
      api.profile.get().catch((error: unknown) => {
        if (error instanceof ApiError && error.code === 'PROFILE_NOT_FOUND') return null;
        throw error;
      }),
      api.records.summary(),
      api.workouts.stats(),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    throw error;
  }
}
export default async function Dashboard() {
  const [user, profile, summary, workoutStats] = await dashboardData();
  const units = profile?.preferredUnits ?? 'METRIC';
  const movementsWithRecords = summary?.movementsWithRecords ?? 0;
  const totalRecords = summary?.totalRecords ?? 0;
  const recentRecords = summary?.recentRecords ?? [];

  return (
    <section className="mx-auto max-w-4xl">
      <p className="text-sm font-semibold text-brand">Tu espacio deportivo</p>
      <h1 className="mt-1 text-3xl font-bold">Hola{user.name ? `, ${user.name}` : ''}</h1>
      {!profile && (
        <div className="mt-6 rounded-2xl border border-brand/25 bg-emerald-50 p-5">
          <p className="font-semibold">Completa tu perfil deportivo.</p>
          <Link
            href="/app/profile"
            className="mt-2 inline-block text-sm font-semibold text-brand underline"
          >
            Ir a mi perfil
          </Link>
        </div>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="font-semibold">Esta semana</h2>
          <p className="mt-3 text-2xl font-bold">{workoutStats.last7Days}</p>
        </article>
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="font-semibold">Este mes</h2>
          <p className="mt-3 text-2xl font-bold">{workoutStats.last30Days}</p>
        </article>
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="font-semibold">Movimientos con marca</h2>
          <p className="mt-3 text-2xl font-bold">{movementsWithRecords}</p>
        </article>
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="font-semibold">Marcas registradas</h2>
          <p className="mt-3 text-2xl font-bold">{totalRecords}</p>
        </article>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="font-semibold">Último entrenamiento</h2>
          {workoutStats.lastWorkout ? (
            <Link className="underline" href={`/app/workouts/${workoutStats.lastWorkout.id}`}>
              {workoutStats.lastWorkout.name} ·{' '}
              {workoutStats.lastWorkout.headline ?? 'Sin resultado'}
            </Link>
          ) : (
            <Link className="underline" href="/app/workouts/new">
              Registrar entrenamiento
            </Link>
          )}
        </article>
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="font-semibold">Marcas desde entrenamientos (30 días)</h2>
          <p className="text-2xl font-bold">{workoutStats.personalRecordsFromWorkoutsLast30Days}</p>
        </article>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="font-semibold">Última marca</h2>
          {summary?.latestRecord ? (
            <p className="mt-3 text-sm">
              {summary.latestRecord.movement.name} ·{' '}
              {formatValue(
                summary.latestRecord.recordType,
                summary.latestRecord.normalizedValue,
                units,
              )}{' '}
              · {summary.latestRecord.performedAt}
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Aún no hay marcas.{' '}
              <Link className="underline" href="/app/movements">
                Explorar movimientos
              </Link>
            </p>
          )}
        </article>
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="font-semibold">Mejora reciente</h2>
          {summary?.recentImprovement ? (
            <p className="mt-3 text-sm">
              {summary.recentImprovement.record.movement.name} ·{' '}
              {formatChange(
                summary.recentImprovement.record.recordType,
                summary.recentImprovement.improvement.absolute,
                units,
              )}
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Aún no hay mejoras registradas.{' '}
              <Link className="underline" href="/app/movements">
                Explorar movimientos
              </Link>
            </p>
          )}
        </article>
      </div>
      {recentRecords.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xl font-bold">Últimos registros</h2>
          <ul className="mt-3 space-y-2">
            {recentRecords.map((record) => (
              <li key={record.id}>
                <Link className="underline" href={`/app/records/${record.movement.slug}`}>
                  {record.movement.name} ·{' '}
                  {formatValue(record.recordType, record.normalizedValue, units)} ·{' '}
                  {record.performedAt}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
