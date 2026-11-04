'use client';

import type { AthleteProfile } from '@garfit/types';
import {
  EXPERIENCE_LEVEL_LABELS,
  EXPERIENCE_LEVELS,
  PRIMARY_GOAL_LABELS,
  PRIMARY_GOALS,
} from '@garfit/validation';
import { useActionState, useState } from 'react';
import { saveProfile, type ProfileState } from '@/app/app-actions';
import { profileFormValues } from '@/lib/profile-units';

const EMPTY_PROFILE_STATE: ProfileState = { errors: {}, message: '' };

type ProfileFormProps = {
  profile: AthleteProfile | null;
};

type FieldErrorProps = {
  messages?: string[];
  name: string;
};

function FieldErrors({ messages, name }: FieldErrorProps) {
  const errorId = `${name}-error`;

  return messages?.map((message) => (
    <p className="mt-1 text-xs text-danger" id={errorId} key={message}>
      {message}
    </p>
  ));
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(saveProfile, EMPTY_PROFILE_STATE);
  const [units, setUnits] = useState(profile?.preferredUnits ?? 'METRIC');
  const values = profileFormValues(profile, units);
  const displayNameError = state.errors.displayName;

  const weightUnitLabel = units === 'IMPERIAL' ? 'lb' : 'kg';
  const heightUnitLabel = units === 'IMPERIAL' ? 'in' : 'cm';

  return (
    <form
      action={formAction}
      className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-6"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-ink" htmlFor="displayName">
          Nombre visible
        </label>
        <input
          aria-describedby={displayNameError ? 'displayName-error' : undefined}
          defaultValue={profile?.displayName ?? ''}
          id="displayName"
          name="displayName"
        />
        <FieldErrors messages={displayNameError} name="displayName" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink" htmlFor="preferredUnits">
          Unidades preferidas
        </label>
        <select
          defaultValue={units}
          id="preferredUnits"
          name="preferredUnits"
          onChange={(event) => setUnits(event.target.value as 'METRIC' | 'IMPERIAL')}
        >
          <option value="METRIC">Métricas (kg, cm)</option>
          <option value="IMPERIAL">Imperiales (lb, in)</option>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink" htmlFor="weight">
            Peso corporal ({weightUnitLabel})
          </label>
          <input
            defaultValue={values.weight}
            id="weight"
            name="weight"
            step="0.1"
            type="number"
          />
          <FieldErrors messages={state.errors.weightKg} name="weight" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink" htmlFor="height">
            Altura ({heightUnitLabel})
          </label>
          <input
            defaultValue={values.height}
            id="height"
            name="height"
            step="0.1"
            type="number"
          />
          <FieldErrors messages={state.errors.heightCm} name="height" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink" htmlFor="birthDate">
            Fecha de nacimiento
          </label>
          <input
            defaultValue={profile?.birthDate ?? ''}
            id="birthDate"
            name="birthDate"
            type="date"
          />
          <FieldErrors messages={state.errors.birthDate} name="birthDate" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink" htmlFor="trainingSince">
            Entrenando desde
          </label>
          <input
            defaultValue={profile?.trainingSince ?? ''}
            id="trainingSince"
            name="trainingSince"
            type="date"
          />
          <FieldErrors messages={state.errors.trainingSince} name="trainingSince" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink" htmlFor="experienceLevel">
          Nivel de experiencia
        </label>
        <select
          defaultValue={profile?.experienceLevel ?? 'BEGINNER'}
          id="experienceLevel"
          name="experienceLevel"
        >
          {EXPERIENCE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {EXPERIENCE_LEVEL_LABELS[level]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink" htmlFor="primaryGoal">
          Objetivo principal
        </label>
        <select
          defaultValue={profile?.primaryGoal ?? 'GENERAL_FITNESS'}
          id="primaryGoal"
          name="primaryGoal"
        >
          {PRIMARY_GOALS.map((goal) => (
            <option key={goal} value={goal}>
              {PRIMARY_GOAL_LABELS[goal]}
            </option>
          ))}
        </select>
      </div>
      {state.message && (
        <p
          className="rounded-[10px] border border-success/30 bg-success/15 p-3 text-sm text-success"
          role="status"
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        className="btn-primary"
        disabled={pending}
      >
        {pending ? 'Guardando…' : 'Guardar perfil'}
      </button>
    </form>
  );
}
