import type { Metadata } from 'next';
import Link from 'next/link';
import { ApiError } from '@garfit/api-client';
import { RECORD_TYPE_LABELS } from '@garfit/validation';
import { notFound, redirect } from 'next/navigation';
import { removeRecord } from '@/app/app-actions';
import { ProgressChart } from '@/components/progress-chart';
import { serverApi } from '@/lib/auth';
import { formatChange, formatValue } from '@/lib/records';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ movementSlug: string }>;
}): Promise<Metadata> {
  const { movementSlug } = await params;
  try {
    const data = await serverApi().records.forMovement(movementSlug);
    return { title: `Historial de ${data.movement.name}` };
  } catch {
    return { title: 'Historial de marcas' };
  }
}

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
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link className="text-sm font-semibold text-accent hover:underline" href="/app/records">
          ← Volver a mis marcas
        </Link>
        <Link
          className="btn-primary"
          href={`/app/records/new?movement=${data.movement.slug}`}
        >
          Registrar marca
        </Link>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Historial de marcas</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{data.movement.name}</h1>
      </div>

      {data.series.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="text-sm text-muted">Aún no hay marcas registradas para este movimiento.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {data.series.map((series) => (
            <div
              key={series.key}
              className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
                <div>
                  <h2 className="text-xl font-bold text-ink">
                    {RECORD_TYPE_LABELS[series.recordType] ?? series.recordType}
                    {series.repetitions ? ` · ${series.repetitions}RM` : ''}
                  </h2>
                  <p className="text-xs text-muted">
                    Mejor marca:{' '}
                    <span className="font-bold text-metric">
                      {formatValue(series.recordType, series.best.normalizedValue, units)}
                    </span>
                  </p>
                </div>
                {series.bestImprovement && (
                  <span className="rounded-full border border-success/30 bg-success/15 px-2.5 py-0.5 text-xs font-bold text-success">
                    Mejora: {formatChange(series.recordType, series.bestImprovement.absolute, units)}
                  </span>
                )}
              </div>

              <div className="mt-4">
                <ProgressChart
                  entries={series.history}
                  recordType={series.recordType}
                  units={units}
                />
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted">Historial de registros</h3>
                <ul className="mt-3 divide-y divide-line rounded-[10px] border border-line bg-raised/30">
                  {series.history.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-ink tabular-nums">
                          {formatValue(series.recordType, entry.normalizedValue, units)}
                        </span>
                        {entry.isPersonalBest && (
                          <span className="rounded-full border border-metric/40 bg-metric/15 px-2 py-0.5 text-[10px] font-bold text-metric">
                            PR
                          </span>
                        )}
                        <span className="text-xs text-muted">{entry.performedAt}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          className="text-xs font-semibold text-accent hover:underline"
                          href={`/app/records/${movementSlug}/${entry.id}/edit`}
                        >
                          Editar
                        </Link>
                        {confirm === entry.id ? (
                          <form action={removeRecord} className="flex items-center gap-2">
                            <input name="id" type="hidden" value={entry.id} />
                            <input name="movementSlug" type="hidden" value={movementSlug} />
                            <button
                              type="submit"
                              className="rounded border border-danger/30 bg-danger/15 px-2 py-0.5 text-xs font-bold text-danger hover:bg-danger/25"
                            >
                              Confirmar
                            </button>
                            <Link
                              className="text-xs text-muted hover:text-ink"
                              href={`/app/records/${movementSlug}`}
                            >
                              Cancelar
                            </Link>
                          </form>
                        ) : (
                          <Link
                            className="text-xs text-muted hover:text-danger hover:underline"
                            href={`/app/records/${movementSlug}?confirm=${entry.id}`}
                          >
                            Eliminar
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
