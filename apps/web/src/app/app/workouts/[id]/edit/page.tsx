import Link from 'next/link';
import { redirect } from 'next/navigation';
import { WorkoutBuilder } from '@/components/workout-builder';
import { serverApi } from '@/lib/auth';

export default async function EditWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workout = await serverApi().workouts.get(id);
  if (workout.status !== 'DRAFT') redirect(`/app/workouts/${id}?notice=not-editable`);
  return (
    <section className="mx-auto max-w-3xl">
      <Link className="underline" href={`/app/workouts/${id}`}>
        Volver
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Editar entrenamiento</h1>
      <WorkoutBuilder workout={workout} />
    </section>
  );
}
