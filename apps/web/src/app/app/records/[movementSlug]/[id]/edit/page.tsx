import Link from 'next/link';
import { ApiError } from '@garfit/api-client';
import { notFound, redirect } from 'next/navigation';
import { RecordForm } from '@/components/record-form';
import { serverApi } from '@/lib/auth';

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
    <section className="mx-auto max-w-2xl">
      <Link className="text-sm underline" href={`/app/records/${movementSlug}`}>
        Volver al historial
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Corregir marca</h1>
      <p className="mt-2 text-muted">{data.movement.name}</p>
      <RecordForm
        movementSlug={movementSlug}
        record={{ ...entry, recordType: entry.recordType }}
        recordTypes={[entry.recordType]}
        units={profile?.preferredUnits ?? 'METRIC'}
      />
    </section>
  );
}
