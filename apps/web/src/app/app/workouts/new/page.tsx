import type { Metadata } from 'next';
import Link from 'next/link';
import { WorkoutBuilder } from '@/components/workout-builder';

export const metadata: Metadata = {
  title: 'Nuevo entrenamiento',
};

export default function NewWorkoutPage() {
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <Link className="text-sm font-semibold text-accent hover:underline" href="/app/workouts">
        ← Volver a entrenamientos
      </Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Creador</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">Nuevo entrenamiento</h1>
      </div>
      <WorkoutBuilder />
    </section>
  );
}
