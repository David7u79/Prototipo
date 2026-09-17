import Link from 'next/link';
import { RECORD_TYPE_LABELS } from '@garfit/validation';
import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  MOVEMENT_CATEGORIES,
  MOVEMENT_CATEGORY_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
} from '@garfit/movements';
import { RECORD_TYPES } from '@garfit/domain';
import { movementQuery, parseMovementFilters } from '@/lib/movement-filters';
import { serverApi } from '@/lib/auth';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const filterClasses = [
  'mt-6 grid gap-3 rounded-2xl border border-line bg-panel p-5',
  'sm:grid-cols-2 lg:grid-cols-3',
].join(' ');

function Options<T extends string>({
  values,
  labels,
}: {
  values: readonly T[];
  labels: Record<T, string>;
}) {
  return values.map((value) => (
    <option key={value} value={value}>
      {labels[value]}
    </option>
  ));
}

export default async function MovementsPage({ searchParams }: Props) {
  const filters = parseMovementFilters(await searchParams);
  const result = await serverApi().movements.list(filters);
  return (
    <section className="mx-auto max-w-5xl">
      <p className="text-sm font-semibold text-brand">Catálogo</p>
      <h1 className="mt-1 text-3xl font-bold">Movimientos</h1>
      <form action="/app/movements" className={filterClasses} method="GET">
        {filters.difficulty && <input name="difficulty" type="hidden" value={filters.difficulty} />}
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="search">
            Buscar
          </label>
          <input
            defaultValue={filters.search}
            id="search"
            name="search"
            placeholder="Ej. barbell full squat"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="category">
            Categoría
          </label>
          <select defaultValue={filters.category ?? ''} id="category" name="category">
            <option value="">Todas</option>
            <Options labels={MOVEMENT_CATEGORY_LABELS} values={MOVEMENT_CATEGORIES} />
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="equipment">
            Equipamiento
          </label>
          <select defaultValue={filters.equipment ?? ''} id="equipment" name="equipment">
            <option value="">Todo</option>
            <Options labels={EQUIPMENT_LABELS} values={EQUIPMENT} />
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="muscleGroup">
            Grupo muscular
          </label>
          <select defaultValue={filters.muscleGroup ?? ''} id="muscleGroup" name="muscleGroup">
            <option value="">Todos</option>
            <Options labels={MUSCLE_GROUP_LABELS} values={MUSCLE_GROUPS} />
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="recordType">
            Tipo de marca
          </label>
          <select defaultValue={filters.recordType ?? ''} id="recordType" name="recordType">
            <option value="">Todos</option>
            <Options labels={RECORD_TYPE_LABELS} values={RECORD_TYPES} />
          </select>
        </div>
        <div className="flex items-end gap-3">
          <button className="rounded-lg bg-brand px-4 py-2 font-semibold text-white">
            Filtrar
          </button>
          <Link className="pb-2 text-sm underline" href="/app/movements">
            Limpiar filtros
          </Link>
        </div>
      </form>
      {result.items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-line bg-panel p-6">
          <p>No encontramos movimientos con esos filtros.</p>
          <Link className="mt-3 inline-block underline" href="/app/movements">
            Limpiar filtros
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {result.items.map((movement) => (
            <article className="rounded-2xl border border-line bg-panel p-5" key={movement.slug}>
              <Link
                className="text-lg font-bold text-brand underline"
                href={`/app/movements/${movement.slug}`}
              >
                {movement.name}
              </Link>
              <p className="mt-2 text-sm text-muted">
                {MOVEMENT_CATEGORY_LABELS[movement.category]} ·{' '}
                {EQUIPMENT_LABELS[movement.equipment]}
              </p>
              <p className="mt-1 text-sm">
                Músculos principales:{' '}
                {movement.primaryMuscles.map((item) => MUSCLE_GROUP_LABELS[item]).join(', ') ||
                  'No especificados'}
              </p>
            </article>
          ))}
        </div>
      )}
      {result.totalPages > 1 && (
        <nav aria-label="Paginación" className="mt-6 flex items-center gap-4">
          <Link
            aria-disabled={result.page <= 1}
            className="underline aria-disabled:pointer-events-none aria-disabled:opacity-50"
            href={`/app/movements?${movementQuery(filters, result.page - 1)}`}
          >
            Anterior
          </Link>
          <span>
            Página {result.page} de {result.totalPages}
          </span>
          <Link
            aria-disabled={result.page >= result.totalPages}
            className="underline aria-disabled:pointer-events-none aria-disabled:opacity-50"
            href={`/app/movements?${movementQuery(filters, result.page + 1)}`}
          >
            Siguiente
          </Link>
        </nav>
      )}
    </section>
  );
}
