'use client';

import type { AthleteProfile } from '@garfit/types';
import {
  EXPERIENCE_LEVEL_LABELS,
  EXPERIENCE_LEVELS,
  PRIMARY_GOAL_LABELS,
  PRIMARY_GOALS,
} from '@garfit/validation';
import { useActionState } from 'react';
import { saveProfile, type ProfileState } from '@/app/app-actions';

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
    <p className="mt-1 text-sm text-red-700" id={errorId} key={message}>
      {message}
    </p>
  ));
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(saveProfile, EMPTY_PROFILE_STATE);
  const displayNameError = state.errors.displayName;

  return (
    <form
      action={formAction}
      className="mt-6 space-y-4 rounded-2xl border border-line bg-panel p-5"
    >
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="displayName">
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
        <label className="mb-1 block text-sm font-medium" htmlFor="experienceLevel">
          Experiencia
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
        <label className="mb-1 block text-sm font-medium" htmlFor="primaryGoal">
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
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-brand" role="status">
          {state.message}
        </p>
      )}
      <button
        className={[
          'rounded-lg bg-brand px-4 py-2 font-semibold text-white',
          'hover:bg-brand-dark disabled:opacity-60',
        ].join(' ')}
        disabled={pending}
      >
        {pending ? 'Guardando…' : 'Guardar perfil'}
      </button>
    </form>
  );
}
