import Link from 'next/link';
import { ApiError } from '@garfit/api-client';
import { notFound, redirect } from 'next/navigation';
import { RecordForm } from '@/components/record-form';
import { serverApi } from '@/lib/auth';
import { parseMovementFilters } from '@/lib/movement-filters';

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
      <section className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">Elige un movimiento</h1>
        <form action="/app/records/new" className="mt-6 flex gap-3" method="GET">
          <label className="sr-only" htmlFor="search">
            Buscar movimiento
          </label>
          <input
            defaultValue={filters.search}
            id="search"
            name="search"
            placeholder="Buscar movimiento"
          />
          <button className="rounded-lg bg-brand px-4 py-2 font-semibold text-white">Buscar</button>
        </form>
        {results && (
          <div className="mt-5 space-y-3">
            {results.items.length === 0 ? (
              <p className="text-sm text-muted">No encontramos movimientos con esa búsqueda.</p>
            ) : (
              results.items.map((movement) => (
                <Link
                  className={[
                    'block rounded-xl border border-line',
                    'bg-panel p-4 font-semibold underline',
                  ].join(' ')}
                  href={`/app/records/new?movement=${movement.slug}`}
                  key={movement.slug}
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

  let movement;
  try {
    movement = await api.movements.get(movementSlug);
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

  return (
    <section className="mx-auto max-w-2xl">
      <Link className="text-sm underline" href="/app/records/new">
        Cambiar movimiento
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Registrar marca</h1>
      <p className="mt-2 text-muted">{movement.name}</p>
      <RecordForm
        movementSlug={movement.slug}
        recordTypes={movement.recordTypes}
        units={profile?.preferredUnits ?? 'METRIC'}
      />
    </section>
  );
}
