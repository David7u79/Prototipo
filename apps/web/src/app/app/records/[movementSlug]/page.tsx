import Link from 'next/link';
import { ApiError } from '@garfit/api-client';
import { RECORD_TYPE_LABELS } from '@garfit/validation';
import { notFound, redirect } from 'next/navigation';
import { removeRecord } from '@/app/app-actions';
import { ProgressChart } from '@/components/progress-chart';
import { serverApi } from '@/lib/auth';
import { formatChange, formatValue } from '@/lib/records';

type Props = {
  params: Promise<{ movementSlug: string }>;
  searchParams: Promise<{ confirm?: string }>;
};

export default async function RecordHistoryPage({ params, searchParams }: Props) {
  const { movementSlug } = await params;
  const { confirm } = await searchParams;
  const api = serverApi();

  let data;
  let profile = null;
  try {
    [data, profile] = await Promise.all([
      api.records.forMovement(movementSlug),
      api.profile.get().catch((error: unknown) => {
        if (error instanceof ApiError && error.code === 'PROFILE_NOT_FOUND') return null;
        throw error;
      }),
    ]);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.code === 'MOVEMENT_NOT_FOUND' || error.status === 404)
    ) {
      notFound();
    }
    if (error instanceof ApiError && error.status === 401) {
      redirect('/login');
    }
    throw error;
  }

  const units = profile?.preferredUnits ?? 'METRIC';

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <Link className="text-sm underline" href="/app/records">
          Volver a mis marcas
        </Link>
        <Link
          className="rounded-lg bg-brand px-4 py-2 font-semibold text-white"
          href="/app/records/new"
        >
          Registrar marca
        </Link>
      </div>
      <h1 className="mt-4 text-3xl font-bold">{data.movement.name}</h1>
      {data.series.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-line bg-panel p-6">
          <p>Aún no hay marcas para este movimiento.</p>
          <Link
            className="mt-3 inline-block underline"
            href={`/app/records/new?movement=${movementSlug}`}
          >
            Registrar la primera marca
          </Link>
        </div>
      ) : (
        data.series.map((series) => (
          <section className="mt-6 rounded-2xl border border-line bg-panel p-5" key={series.key}>
            <h2 className="text-xl font-bold">
              {RECORD_TYPE_LABELS[series.recordType] ?? series.recordType}
              {series.repetitions ? ` · ${series.repetitions}RM` : ''}
            </h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-muted">Mejor marca</dt>
                <dd>{formatValue(series.recordType, series.best.normalizedValue, units)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Marca actual</dt>
                <dd>{formatValue(series.recordType, series.current.normalizedValue, units)}</dd>
              </div>
              {series.changeFromPrevious && (
                <div>
                  <dt className="text-sm text-muted">Cambio anterior</dt>
                  <dd>
                    {formatChange(series.recordType, series.changeFromPrevious.absolute, units)} (
                    {series.changeFromPrevious.improved ? 'Mejora' : 'Empeoramiento'})
                  </dd>
                </div>
              )}
              {series.totalProgress && (
                <div>
                  <dt className="text-sm text-muted">Progreso total</dt>
                  <dd>
                    {formatChange(series.recordType, series.totalProgress.absolute, units)} (
                    {series.totalProgress.improved ? 'Mejora' : 'Empeoramiento'})
                  </dd>
                </div>
              )}
            </dl>
            <ProgressChart entries={series.history} recordType={series.recordType} units={units} />
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left">
                <caption className="sr-only">Historial de marcas</caption>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Valor</th>
                    <th>Estado</th>
                    <th>Notas</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {series.history.map((entry) => (
                    <tr className="border-t border-line" key={entry.id}>
                      <td>{entry.performedAt}</td>
                      <td>
                        {formatValue(series.recordType, entry.normalizedValue, units)}
                        {series.recordType === 'TIME' && entry.distanceMeters
                          ? ` · ${formatValue('DISTANCE', entry.distanceMeters, units)}`
                          : ''}
                      </td>
                      <td>{entry.isPersonalBest ? 'Mejor marca' : ''}</td>
                      <td>
                        {entry.notes ?? ''}
                        {entry.origin && (
                          <Link
                            className="block underline"
                            href={`/app/workouts/${entry.origin.workoutId}`}
                          >
                            Origen: {entry.origin.workoutName}
                            {' · '}
                            {entry.origin.performedOn} · Serie {entry.origin.setNumber}
                          </Link>
                        )}
                      </td>
                      <td>
                        {entry.source === 'WORKOUT' ? (
                          <span className="text-muted">Gestionada por entrenamiento</span>
                        ) : (
                          <>
                            <Link
                              className="underline"
                              href={`/app/records/${movementSlug}/${entry.id}/edit`}
                            >
                              Editar
                            </Link>
                            {confirm === entry.id ? (
                              <form action={removeRecord} className="mt-2">
                                <input name="id" type="hidden" value={entry.id} />
                                <input name="movementSlug" type="hidden" value={movementSlug} />
                                <p className="text-sm text-amber-700">
                                  Esta marca dejará de contar en tu historial
                                </p>
                                <div className="mt-1 flex items-center gap-2">
                                  <button className="font-semibold text-red-700 underline">
                                    Confirmar retiro
                                  </button>
                                  <Link
                                    className="text-sm text-muted underline"
                                    href={`/app/records/${movementSlug}`}
                                  >
                                    Cancelar
                                  </Link>
                                </div>
                              </form>
                            ) : (
                              <Link
                                className="ml-2 underline"
                                href={`/app/records/${movementSlug}?confirm=${entry.id}`}
                              >
                                Retirar
                              </Link>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </section>
  );
}
