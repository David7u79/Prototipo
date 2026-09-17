import Link from 'next/link';
import { WorkoutBuilder } from '@/components/workout-builder';

export default function NewWorkoutPage() {
  return (
    <section className="mx-auto max-w-3xl">
      <Link className="underline" href="/app/workouts">
        Volver
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Nuevo entrenamiento</h1>
      <WorkoutBuilder />
    </section>
  );
}
