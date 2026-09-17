'use client';

import type { WorkoutType } from '@garfit/domain';
import type { MovementSummary, WorkoutDetail } from '@garfit/types';
import { WORKOUT_TYPE_LABELS } from '@garfit/validation';
import { useActionState, useEffect, useState } from 'react';
import { createWorkout, updateWorkout, type WorkoutState } from '@/app/workout-actions';
import {
  builderExercise,
  mapWorkoutForBuilder,
  prescriptionIssue,
  type BuilderExercise,
} from '@/lib/workout-builder';

const EMPTY: WorkoutState = { errors: {}, message: '' };
type Props = { workout?: WorkoutDetail };

export function WorkoutBuilder({ workout }: Props) {
  const [exercises, setExercises] = useState<BuilderExercise[]>(() =>
    workout ? mapWorkoutForBuilder(workout) : [],
  );
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<MovementSummary[]>([]);
  const [type, setType] = useState<WorkoutType>(workout?.workoutType ?? 'STRENGTH');
  const [createState, createAction, creating] = useActionState(createWorkout, EMPTY);
  const [updateState, updateAction, updating] = useActionState(updateWorkout, EMPTY);
  const action = workout ? updateAction : createAction;
  const state = workout ? updateState : createState;
  const issue = prescriptionIssue(exercises);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/app/workouts/movement-search?q=${encodeURIComponent(value)}`, {
        signal: controller.signal,
      });
      if (response.ok) setMatches((await response.json()) as MovementSummary[]);
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const replace = (index: number, next: BuilderExercise) =>
    setExercises(exercises.map((item, i) => (i === index ? next : item)));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= exercises.length) return;
    const next = [...exercises];
    [next[index], next[target]] = [next[target], next[index]];
    setExercises(next);
  };

  return (
    <form action={action} className="mt-6 space-y-5 rounded-2xl border border-line bg-panel p-5">
      {workout && <input name="id" type="hidden" value={workout.id} />}
      <input name="exercises" type="hidden" value={JSON.stringify(exercises)} />
      <label>
        Nombre
        <input defaultValue={workout?.name} name="name" required />
      </label>
      {!workout && (
        <label>
          Tipo
          <select
            name="workoutType"
            onChange={(event) => setType(event.target.value as WorkoutType)}
          >
            {Object.entries(WORKOUT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} selected={value === type} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
      {!workout && <Prescription type={type} />}
      <section aria-label="Ejercicios">
        <h2 className="font-semibold">Ejercicios</h2>
        <label>
          Buscar movimiento
          <input onChange={(event) => setQuery(event.target.value)} value={query} />
        </label>
        {query.trim().length >= 2 && matches.length > 0 && (
          <ul className="mt-2 rounded border border-line" role="listbox">
            {matches.map((movement) => (
              <li key={movement.slug}>
                <button
                  onClick={() => {
                    setExercises([...exercises, builderExercise(movement)]);
                    setQuery('');
                    setMatches([]);
                  }}
                  type="button"
                >
                  {movement.name} · {movement.category} · {movement.recordTypes.join(', ')}
                </button>
              </li>
            ))}
          </ul>
        )}
        {exercises.map((exercise, index) => (
          <ExerciseEditor
            exercise={exercise}
            index={index}
            key={`${exercise.movementSlug}-${index}`}
            onChange={(next) => replace(index, next)}
            onMove={move}
            onRemove={() => setExercises(exercises.filter((_, i) => i !== index))}
          />
        ))}
      </section>
      {issue && <p role="alert">{issue}</p>}
      {state.message && <p role="alert">{state.message}</p>}
      <button
        className="rounded-lg bg-brand px-4 py-2 font-semibold text-white disabled:opacity-60"
        disabled={creating || updating || issue !== null}
      >
        Guardar entrenamiento
      </button>
    </form>
  );
}

function Prescription({ type }: { type: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {(type === 'AMRAP' || type === 'EMOM' || type === 'FOR_TIME') && (
        <Field label={type === 'FOR_TIME' ? 'Límite (s)' : 'Duración (s)'} name="durationSeconds" />
      )}
      {type === 'EMOM' && <Field label="Intervalo (s)" name="intervalSeconds" />}
      {(type === 'AMRAP' || type === 'EMOM') && <Field label="Rondas" name="rounds" />}
      {(type === 'FOR_TIME' || type === 'CUSTOM') && (
        <Field label="Esquema" name="repScheme" placeholder="21-15-9" />
      )}
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <label>
      {label}
      <input min="1" name={name} placeholder={placeholder} type={placeholder ? 'text' : 'number'} />
    </label>
  );
}

function ExerciseEditor({
  exercise,
  index,
  onChange,
  onMove,
  onRemove,
}: {
  exercise: BuilderExercise;
  index: number;
  onChange: (value: BuilderExercise) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const update = (key: keyof BuilderExercise, value: string | number | null) =>
    onChange({ ...exercise, [key]: value });
  const weight = exercise.recordTypes.includes('WEIGHT');
  const distance =
    exercise.recordTypes.includes('DISTANCE') || exercise.recordTypes.includes('TIME');
  return (
    <fieldset className="mt-4 grid gap-2 rounded border border-line p-3 sm:grid-cols-3">
      <legend>{exercise.name}</legend>
      <NumberInput
        label="Series"
        value={exercise.targetSets ?? null}
        onChange={(value) => update('targetSets', value)}
      />
      <NumberInput
        label="Repeticiones"
        value={exercise.targetReps ?? null}
        onChange={(value) => update('targetReps', value)}
      />
      {weight && (
        <NumberInput
          label="Carga"
          value={exercise.targetLoadValue ?? null}
          onChange={(value) => update('targetLoadValue', value)}
        />
      )}
      {weight && (
        <UnitInput
          label="Unidad de carga"
          value={exercise.targetLoadUnit ?? null}
          values={['KILOGRAM', 'POUND']}
          onChange={(value) => update('targetLoadUnit', value)}
        />
      )}
      {distance && (
        <NumberInput
          label="Distancia"
          value={exercise.targetDistanceValue ?? null}
          onChange={(value) => update('targetDistanceValue', value)}
        />
      )}
      {distance && (
        <UnitInput
          label="Unidad de distancia"
          value={exercise.targetDistanceUnit ?? null}
          values={['METER', 'KILOMETER', 'MILE']}
          onChange={(value) => update('targetDistanceUnit', value)}
        />
      )}
      {exercise.recordTypes.includes('TIME') && (
        <NumberInput
          label="Duración (s)"
          value={exercise.targetDurationSeconds ?? null}
          onChange={(value) => update('targetDurationSeconds', value)}
        />
      )}
      <div className="flex gap-2 sm:col-span-3">
        <button
          aria-label={`Subir ${exercise.name}`}
          onClick={() => onMove(index, -1)}
          type="button"
        >
          Subir
        </button>
        <button
          aria-label={`Bajar ${exercise.name}`}
          onClick={() => onMove(index, 1)}
          type="button"
        >
          Bajar
        </button>
        <button aria-label={`Quitar ${exercise.name}`} onClick={onRemove} type="button">
          Quitar
        </button>
      </div>
    </fieldset>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <label>
      {label}
      <input
        min="1"
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        type="number"
        value={value ?? ''}
      />
    </label>
  );
}

function UnitInput({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string | null;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      {/* Sin unidad elegida se muestra vacío: mostrar la primera unidad haría creer que ya
          está seleccionada y el guardado fallaba sin explicar por qué. */}
      <select onChange={(event) => onChange(event.target.value)} value={value ?? ''}>
        <option value="">Selecciona unidad</option>
        {values.map((unit) => (
          <option key={unit}>{unit}</option>
        ))}
      </select>
    </label>
  );
}
