import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { WorkoutBuilder } from '@/components/workout-builder';
import { serverApi } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Editar entrenamiento',
};

export default async function EditWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workout = await serverApi().workouts.get(id);
  if (workout.status !== 'DRAFT') redirect(`/app/workouts/${id}?notice=not-editable`);

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <Link className="text-sm font-semibold text-accent hover:underline" href={`/app/workouts/${id}`}>
        ← Volver
      </Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Modificación</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">Editar entrenamiento</h1>
      </div>
      <WorkoutBuilder workout={workout} />
    </section>
  );
}
