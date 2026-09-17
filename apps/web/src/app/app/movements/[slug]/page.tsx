import Link from 'next/link';
import { ApiError } from '@garfit/api-client';
import {
  EQUIPMENT_LABELS,
  MOVEMENT_CATEGORY_LABELS,
  MOVEMENT_DIFFICULTY_LABELS,
  MUSCLE_GROUP_LABELS,
} from '@garfit/movements';
import { RECORD_TYPE_LABELS } from '@garfit/validation';
import { notFound } from 'next/navigation';
import { serverApi } from '@/lib/auth';
import { formatValue } from '@/lib/records';

type Props = { params: Promise<{ slug: string }> };

export default async function MovementDetailPage({ params }: Props) {
  const data = await movementData((await params).slug);
  if (!data) notFound();
  const { movement, records, profile } = data;
  const series0 = records?.series[0];
  const best = series0?.best;
  const units = profile?.preferredUnits ?? 'METRIC';

  return (
    <section className="mx-auto max-w-3xl">
      <Link className="text-sm underline" href="/app/movements">
        Volver a movimientos
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{movement.name}</h1>
      <dl className="mt-6 grid gap-4 rounded-2xl border border-line bg-panel p-5 sm:grid-cols-2">
        <Detail label="Categoría" value={MOVEMENT_CATEGORY_LABELS[movement.category]} />
        <Detail label="Equipamiento" value={EQUIPMENT_LABELS[movement.equipment]} />
        {movement.difficulty && (
          <Detail label="Dificultad" value={MOVEMENT_DIFFICULTY_LABELS[movement.difficulty]} />
        )}
        <Detail label="Músculos principales" value={muscles(movement.primaryMuscles)} />
        <Detail label="Músculos secundarios" value={muscles(movement.secondaryMuscles)} />
        <Detail
          label="Marcas admitidas"
          value={movement.recordTypes.map((item) => RECORD_TYPE_LABELS[item]).join(', ')}
        />
      </dl>
      {movement.description && <p className="mt-5 text-muted">{movement.description}</p>}
      <h2 className="mt-8 text-xl font-bold">Cómo se realiza</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-6">
        {movement.instructions.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <Link
        className="mt-6 inline-block rounded-lg bg-brand px-4 py-2 font-semibold text-white"
        href={`/app/records/new?movement=${movement.slug}`}
      >
        Registrar una marca
      </Link>
      {best && series0 && (
        <div className="mt-6 rounded-2xl border border-line bg-panel p-5">
          <p className="font-semibold">
            Tu mejor marca
            {series0.repetitions ? ` (${series0.repetitions}RM)` : ''}:{' '}
            {formatValue(series0.recordType, best.normalizedValue, units)}
          </p>
          <Link className="mt-2 inline-block underline" href={`/app/records/${movement.slug}`}>
            Ver historial
          </Link>
        </div>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function muscles(items: readonly (keyof typeof MUSCLE_GROUP_LABELS)[]) {
  return items.map((item) => MUSCLE_GROUP_LABELS[item]).join(', ') || 'No especificados';
}

async function movementData(slug: string) {
  try {
    const api = serverApi();
    const [movement, records, profile] = await Promise.all([
      api.movements.get(slug),
      api.records.forMovement(slug).catch(() => null),
      api.profile.get().catch(() => null),
    ]);
    return { movement, records, profile };
  } catch (error) {
    if (error instanceof ApiError && error.code === 'MOVEMENT_NOT_FOUND') return null;
    throw error;
  }
}
