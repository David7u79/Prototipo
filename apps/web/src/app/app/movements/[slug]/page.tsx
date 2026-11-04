import type { Metadata } from 'next';
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const movement = await serverApi().movements.get(slug);
    return { title: movement.name };
  } catch {
    return { title: 'Detalle de movimiento' };
  }
}

export default async function MovementDetailPage({ params }: Props) {
  const data = await movementData((await params).slug);
  if (!data) notFound();
  const { movement, records, profile } = data;
  const aiAvailable = await serverApi()
    .ai.status()
    .then((status) => status.enabled && status.configured)
    .catch(() => false);
  const series0 = records?.series[0];
  const best = series0?.best;
  const units = profile?.preferredUnits ?? 'METRIC';

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <Link className="text-sm font-semibold text-accent hover:underline" href="/app/movements">
        ← Volver a movimientos
      </Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Detalle de movimiento</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{movement.name}</h1>
      </div>

      <dl className="grid gap-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2">
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

      {movement.description && (
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm leading-relaxed text-muted">{movement.description}</p>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-ink">Cómo se realiza</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm text-ink/90">
          {movement.instructions.map((step) => (
            <li key={step} className="leading-relaxed">
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Link
          className="btn-primary"
          href={`/app/records/new?movement=${movement.slug}`}
        >
          Registrar una marca
        </Link>
        {aiAvailable && (
          <Link
            className="btn-secondary"
            href={`/app/ai?type=movement&slug=${movement.slug}`}
          >
            Explicar con IA
          </Link>
        )}
      </div>

      {best && series0 && (
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm font-semibold text-ink">
            Tu mejor marca
            {series0.repetitions ? ` (${series0.repetitions}RM)` : ''}:{' '}
            <span className="font-extrabold text-metric tabular-nums">
              {formatValue(series0.recordType, best.normalizedValue, units)}
            </span>
          </p>
          <Link
            className="mt-2 inline-block text-xs font-semibold text-accent hover:underline"
            href={`/app/records/${movement.slug}`}
          >
            Ver historial →
          </Link>
        </div>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1 font-medium text-ink">{value}</dd>
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
