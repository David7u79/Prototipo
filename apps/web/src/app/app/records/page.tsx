import Link from 'next/link';
import { ApiError } from '@garfit/api-client';
import { RECORD_TYPE_LABELS } from '@garfit/validation';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/auth';
import { formatChange, formatValue } from '@/lib/records';

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
    <section className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-brand">Rendimiento</p>
          <h1 className="mt-1 text-3xl font-bold">Mis marcas</h1>
        </div>
        <Link
          className="rounded-lg bg-brand px-4 py-2 font-semibold text-white"
          href="/app/records/new"
        >
          Registrar marca
        </Link>
      </div>
      {overview.items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-line bg-panel p-6">
          <p>Aún no has registrado marcas.</p>
          <Link className="mt-3 inline-block underline" href="/app/movements">
            Explorar movimientos
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {overview.items.map(({ movement, series }) => (
            <article className="rounded-2xl border border-line bg-panel p-5" key={series.key}>
              <h2 className="font-bold">{movement.name}</h2>
              <p className="text-sm text-muted">
                {RECORD_TYPE_LABELS[series.recordType] ?? series.recordType}
                {series.repetitions ? ` · ${series.repetitions}RM` : ''}
              </p>
              <p className="mt-3 text-lg">
                Mejor marca: {formatValue(series.recordType, series.best.normalizedValue, units)}
              </p>
              {series.bestImprovement && (
                <p className="text-sm">
                  Mejora: {formatChange(series.recordType, series.bestImprovement.absolute, units)}
                </p>
              )}
              <p className="mt-2 text-sm text-muted">{series.best.performedAt}</p>
              <Link className="mt-3 inline-block underline" href={`/app/records/${movement.slug}`}>
                Ver historial
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
