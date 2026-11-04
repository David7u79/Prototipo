import type { Metadata } from 'next';
import Link from 'next/link';
import { ApiError } from '@garfit/api-client';
import { notFound, redirect } from 'next/navigation';
import { RecordForm } from '@/components/record-form';
import { serverApi } from '@/lib/auth';
import { parseMovementFilters } from '@/lib/movement-filters';

export const metadata: Metadata = {
  title: 'Registrar marca',
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NewRecordPage({ searchParams }: Props) {
  const query = await searchParams;
  const movementSlug = typeof query.movement === 'string' ? query.movement : '';
  const api = serverApi();

  let profile = null;
  try {
    profile = await api.profile.get().catch((error: unknown) => {
      if (error instanceof ApiError && error.code === 'PROFILE_NOT_FOUND') return null;
      throw error;
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect('/login');
    }
    throw error;
  }

  if (!movementSlug) {
    const filters = parseMovementFilters(query);
    const results = filters.search
      ? await api.movements.list({ ...filters, limit: 10 }).catch(() => null)
      : null;

    return (
      <section className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Nueva marca</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">Elige un movimiento</h1>
        </div>

        <form action="/app/records/new" className="flex gap-2.5" method="GET">
          <label className="sr-only" htmlFor="search">
            Buscar movimiento
          </label>
          <input
            defaultValue={filters.search}
            id="search"
            name="search"
            placeholder="Buscar movimiento..."
            className="flex-1"
          />
          <button type="submit" className="btn-primary">
            Buscar
          </button>
        </form>

        {results && (
          <div className="space-y-3">
            {results.items.length === 0 ? (
              <div className="rounded-2xl border border-line bg-surface p-6 text-center text-sm text-muted">
                No encontramos movimientos con esa búsqueda.
              </div>
            ) : (
              results.items.map((movement) => (
                <Link
                  className="block rounded-2xl border border-line bg-surface p-4 font-semibold text-ink no-underline transition hover:border-accent hover:text-accent"
                  href={`/app/records/new?movement=${movement.slug}`}
                  key={movement.id}
                >
                  {movement.name}
                </Link>
              ))
            )}
          </div>
        )}
      </section>
    );
  }

  const movement = await api.movements.get(movementSlug).catch((error: unknown) => {
    if (
      error instanceof ApiError &&
      (error.code === 'MOVEMENT_NOT_FOUND' || error.status === 404)
    ) {
      notFound();
    }
    throw error;
  });

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <Link className="text-sm font-semibold text-accent hover:underline" href="/app/records">
        ← Volver a marcas
      </Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Nueva marca personal</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{movement.name}</h1>
      </div>
      <RecordForm
        movementSlug={movement.slug}
        recordTypes={movement.recordTypes}
        units={profile?.preferredUnits ?? 'METRIC'}
      />
    </section>
  );
}
