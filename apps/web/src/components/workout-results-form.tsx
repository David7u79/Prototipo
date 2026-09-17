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
    <form action={complete} className="mt-6 space-y-5 rounded-2xl border border-line bg-panel p-5">
      <input name="id" type="hidden" value={workout.id} />
      <input name="type" type="hidden" value={workout.workoutType} />
      <input name="results" type="hidden" value={JSON.stringify(results)} />
      {results.map((exercise, index) => (
        <ExerciseRows
          exercise={exercise}
          key={exercise.exerciseId}
          name={workout.exercises[index].movement.name}
          onChange={(next) => setResults(results.map((item, i) => (i === index ? next : item)))}
        />
      ))}
      <Score type={workout.workoutType} />
      {state.message && <p role="alert">{state.message}</p>}
      <div className="flex gap-3">
        <button formAction={save} disabled={saving}>
          Guardar resultados
        </button>
        <button className="rounded-lg bg-brand px-4 py-2 text-white" disabled={completing}>
          Completar
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
    <section>
      <h2 className="font-semibold">{name}</h2>
      {exercise.sets.map((set, index) => (
        <div className="mt-2 grid grid-cols-4 gap-2" key={set.setNumber}>
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
            placeholder="Distancia"
            type="number"
            value={set.distanceValue ?? ''}
          />
          <button
            onClick={() =>
              onChange({ ...exercise, sets: exercise.sets.filter((_, i) => i !== index) })
            }
            type="button"
          >
            Quitar
          </button>
        </div>
      ))}
      <button
        className="mt-2 underline"
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
        Añadir serie
      </button>
    </section>
  );
}
function Score({ type }: { type: WorkoutDetail['workoutType'] }) {
  if (type === 'FOR_TIME')
    return (
      <div>
        <label htmlFor="time">Tiempo (mm:ss)</label>
        <input id="time" name="time" placeholder="05:30" />
      </div>
    );
  if (type === 'AMRAP')
    return (
      <div>
        <label htmlFor="rounds">Rondas</label>
        <input id="rounds" name="rounds" type="number" />
        <label htmlFor="extraReps">Reps extra</label>
        <input id="extraReps" name="extraReps" type="number" />
      </div>
    );
  if (type === 'EMOM')
    return (
      <fieldset>
        <legend>¿Completaste todos los intervalos?</legend>
        <label>
          <input name="completed" type="radio" value="true" />
          Sí
        </label>
        <label>
          <input name="completed" type="radio" value="false" />
          No
        </label>
      </fieldset>
    );
  return null;
}
