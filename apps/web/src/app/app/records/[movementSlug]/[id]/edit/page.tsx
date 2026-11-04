import type { Metadata } from 'next';
import Link from 'next/link';
import { ApiError } from '@garfit/api-client';
import { notFound, redirect } from 'next/navigation';
import { RecordForm } from '@/components/record-form';
import { serverApi } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Corregir marca',
};

type Props = { params: Promise<{ movementSlug: string; id: string }> };

export default async function EditRecordPage({ params }: Props) {
  const { movementSlug, id } = await params;
  const api = serverApi();

  let data;
  let profile = null;
  try {
    [data, profile] = await Promise.all([
      api.records.forMovement(movementSlug),
      api.profile.get().catch(() => null),
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

  const entry = data.series.flatMap((series) => series.history).find((item) => item.id === id);
  if (!entry) notFound();

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <Link className="text-sm font-semibold text-accent hover:underline" href={`/app/records/${movementSlug}`}>
        ← Volver al historial
      </Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">{data.movement.name}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">Corregir marca</h1>
      </div>
      <RecordForm
        movementSlug={movementSlug}
        record={{ ...entry, recordType: entry.recordType }}
        recordTypes={[entry.recordType]}
        units={profile?.preferredUnits ?? 'METRIC'}
      />
    </section>
  );
}
