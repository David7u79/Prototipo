'use client';
import type { WorkoutDetail } from '@garfit/types';
import type { WorkoutSetInput } from '@garfit/validation';
import { useActionState, useState } from 'react';
import { completeWorkout, saveWorkoutResults, type WorkoutState } from '@/app/workout-actions';
import { initialSets } from '@/lib/workouts';

type ResultExercise = { exerciseId: string; sets: WorkoutSetInput[] };
const EMPTY: WorkoutState = { errors: {}, message: '' };

export function WorkoutResultsForm({ workout }: { workout: WorkoutDetail }) {
  const [results, setResults] = useState<ResultExercise[]>(() => workout.exercises.map(toResults));
  const [state, save, saving] = useActionState(saveWorkoutResults, EMPTY);
  const [, complete, completing] = useActionState(completeWorkout, EMPTY);

  return (
    <form action={complete} className="mt-6 space-y-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <input name="id" type="hidden" value={workout.id} />
      <input name="type" type="hidden" value={workout.workoutType} />
      <input name="results" type="hidden" value={JSON.stringify(results)} />

      <div className="space-y-6">
        {results.map((exercise, index) => (
          <ExerciseRows
            exercise={exercise}
            key={exercise.exerciseId}
            name={workout.exercises[index].movement.name}
            onChange={(next) => setResults(results.map((item, i) => (i === index ? next : item)))}
          />
        ))}
      </div>

      <Score type={workout.workoutType} />

      {state.message && (
        <p className="rounded-[10px] border border-danger/30 bg-danger/15 p-3 text-sm text-danger" role="alert">
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button type="submit" formAction={save} disabled={saving} className="btn-secondary">
          {saving ? 'Guardando…' : 'Guardar resultados'}
        </button>
        <button type="submit" className="btn-primary" disabled={completing}>
          {completing ? 'Completando…' : 'Completar entrenamiento'}
        </button>
      </div>
    </form>
  );
}

function toResults(exercise: WorkoutDetail['exercises'][number]): ResultExercise {
  const sets = exercise.results.length
    ? exercise.results.map((set) => ({
        setNumber: set.setNumber,
        reps: set.reps,
        loadValue: set.loadValue,
        loadUnit: set.loadUnit,
        distanceValue: set.distanceValue,
        distanceUnit: set.distanceUnit,
        durationSeconds: set.durationSeconds,
      }))
    : initialSets(exercise);
  return { exerciseId: exercise.id, sets };
}

function ExerciseRows({
  exercise,
  name,
  onChange,
}: {
  exercise: ResultExercise;
  name: string;
  onChange: (next: ResultExercise) => void;
}) {
  const update = (index: number, key: 'reps' | 'loadValue' | 'distanceValue', value: string) =>
    onChange({
      ...exercise,
      sets: exercise.sets.map((set, i) =>
        i === index ? { ...set, [key]: value === '' ? null : Number(value) } : set,
      ),
    });

  return (
    <div className="rounded-xl border border-line bg-raised/30 p-4">
      <h3 className="font-bold text-ink">{name}</h3>
      <div className="mt-3 space-y-2">
        {exercise.sets.map((set, index) => (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 items-center" key={set.setNumber}>
            <input
              aria-label={`Serie ${index + 1} reps`}
              min="0"
              onChange={(e) => update(index, 'reps', e.target.value)}
              placeholder="Reps"
              type="number"
              value={set.reps ?? ''}
            />
            <input
              aria-label={`Serie ${index + 1} carga`}
              min="0"
              onChange={(e) => update(index, 'loadValue', e.target.value)}
              placeholder="kg"
              type="number"
              value={set.loadValue ?? ''}
            />
            <input
              aria-label={`Serie ${index + 1} distancia`}
              min="0"
              onChange={(e) => update(index, 'distanceValue', e.target.value)}
              placeholder="Distancia (m)"
              type="number"
              value={set.distanceValue ?? ''}
            />
            <button
              onClick={() =>
                onChange({ ...exercise, sets: exercise.sets.filter((_, i) => i !== index) })
              }
              type="button"
              className="rounded-[10px] border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-bold text-danger hover:bg-danger/20"
            >
              Quitar serie
            </button>
          </div>
        ))}
      </div>
      <button
        className="mt-3 text-xs font-semibold text-accent hover:underline"
        onClick={() =>
          onChange({
            ...exercise,
            sets: [
              ...exercise.sets,
              { ...exercise.sets.at(-1), setNumber: exercise.sets.length + 1 },
            ],
          })
        }
        type="button"
      >
        + Añadir serie
      </button>
    </div>
  );
}

function Score({ type }: { type: WorkoutDetail['workoutType'] }) {
  if (type === 'FOR_TIME')
    return (
      <div className="rounded-xl border border-line bg-raised/30 p-4">
        <label className="mb-1 block text-sm font-medium text-ink" htmlFor="time">
          Tiempo total (mm:ss)
        </label>
        <input id="time" name="time" placeholder="05:30" />
      </div>
    );
  if (type === 'AMRAP')
    return (
      <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-line bg-raised/30 p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink" htmlFor="rounds">
            Rondas completadas
          </label>
          <input id="rounds" name="rounds" type="number" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink" htmlFor="extraReps">
            Reps adicionales
          </label>
          <input id="extraReps" name="extraReps" type="number" />
        </div>
      </div>
    );
  if (type === 'EMOM')
    return (
      <fieldset className="rounded-xl border border-line bg-raised/30 p-4">
        <legend className="px-2 text-sm font-bold text-ink">¿Completaste todos los intervalos?</legend>
        <div className="mt-2 flex gap-6">
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input name="completed" type="radio" value="true" className="w-auto" />
            Sí
          </label>
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input name="completed" type="radio" value="false" className="w-auto" />
            No
          </label>
        </div>
      </fieldset>
    );
  return null;
}
