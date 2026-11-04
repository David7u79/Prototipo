import type { Metadata } from 'next';
import Link from 'next/link';
import { ApiError } from '@garfit/api-client';
import { RECORD_TYPE_LABELS } from '@garfit/validation';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/auth';
import { formatChange, formatValue } from '@/lib/records';

export const metadata: Metadata = {
  title: 'Marcas personales',
};

export default async function RecordsPage() {
  const api = serverApi();
  let overview;
  let profile = null;
  try {
    [overview, profile] = await Promise.all([
      api.records.overview(),
      api.profile.get().catch((error: unknown) => {
        if (error instanceof ApiError && error.code === 'PROFILE_NOT_FOUND') return null;
        throw error;
      }),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect('/login');
    }
    throw error;
  }

  const units = profile?.preferredUnits ?? 'METRIC';

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Rendimiento</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">Mis marcas</h1>
        </div>
        <Link className="btn-primary" href="/app/records/new">
          Registrar marca
        </Link>
      </div>

      {overview.items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="text-base font-semibold text-ink">Aún no has registrado marcas personales.</p>
          <p className="mt-1 text-sm text-muted">
            Explora los movimientos del catálogo para añadir tus primeras marcas.
          </p>
          <Link className="btn-secondary mt-4 inline-flex" href="/app/movements">
            Explorar movimientos
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {overview.items.map(({ movement, series }) => (
            <article
              className="rounded-2xl border border-line bg-surface p-5 transition hover:border-line/80"
              key={`${movement.slug}-${series.key}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-ink">{movement.name}</h2>
                  <p className="text-xs text-muted">
                    {RECORD_TYPE_LABELS[series.recordType] ?? series.recordType}
                    {series.repetitions ? ` · ${series.repetitions}RM` : ''}
                  </p>
                </div>
                {series.bestImprovement && (
                  <span className="rounded-full border border-success/30 bg-success/15 px-2.5 py-0.5 text-xs font-bold text-success">
                    {formatChange(series.recordType, series.bestImprovement.absolute, units)}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-xs text-muted">Mejor marca:</span>
                <span className="text-2xl font-extrabold text-metric tabular-nums">
                  {formatValue(series.recordType, series.best.normalizedValue, units)}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-3 text-xs">
                <span className="text-muted">{series.best.performedAt}</span>
                <Link
                  className="font-semibold text-accent hover:underline"
                  href={`/app/records/${movement.slug}`}
                >
                  Ver historial →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
