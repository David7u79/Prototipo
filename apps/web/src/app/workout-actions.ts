'use server';

import { ApiError } from '@garfit/api-client';
import { createWorkoutSchema, updateWorkoutSchema, workoutResultsSchema } from '@garfit/validation';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/auth';
import { apiErrorMessage } from '@/lib/records';
import { parseRepScheme, resultsFromForm, scoreFor } from '@/lib/workouts';

export type WorkoutState = { errors: Record<string, string[] | undefined>; message: string };
const empty = (): WorkoutState => ({ errors: {}, message: '' });

function nullableNumber(formData: FormData, name: string) {
  const value = formData.get(name);
  return value === null || value === '' ? null : Number(value);
}

function withoutBuilderMetadata(exercise: Record<string, unknown>) {
  const input = { ...exercise };
  delete input.name;
  delete input.recordTypes;
  return input;
}

export async function createWorkout(
  _state: WorkoutState,
  formData: FormData,
): Promise<WorkoutState> {
  const repScheme = parseRepScheme(String(formData.get('repScheme') ?? '')) ?? [];
  const exercises = JSON.parse(String(formData.get('exercises') ?? '[]')).map(
    withoutBuilderMetadata,
  );
  const parsed = createWorkoutSchema.safeParse({
    name: formData.get('name'),
    workoutType: formData.get('workoutType'),
    description: null,
    notes: formData.get('notes') || null,
    exercises,
    repScheme,
    durationSeconds: nullableNumber(formData, 'durationSeconds'),
    rounds: nullableNumber(formData, 'rounds'),
    intervalSeconds: nullableNumber(formData, 'intervalSeconds'),
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: '' };
  // redirect() lanza NEXT_REDIRECT: debe quedar fuera del try/catch o se trataría como error.
  let workoutId: string;
  try {
    workoutId = (await serverApi().workouts.create(parsed.data)).id;
  } catch (error) {
    return { errors: {}, message: apiErrorMessage(error) };
  }
  redirect(`/app/workouts/${workoutId}`);
}

export async function updateWorkout(
  _state: WorkoutState,
  formData: FormData,
): Promise<WorkoutState> {
  const parsedExercises = JSON.parse(String(formData.get('exercises') ?? '[]'));
  const parsed = updateWorkoutSchema.safeParse({
    name: formData.get('name'),
    exercises: parsedExercises.map(withoutBuilderMetadata),
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: '' };
  const id = String(formData.get('id'));
  try {
    await serverApi().workouts.update(id, parsed.data);
  } catch (error) {
    return { errors: {}, message: apiErrorMessage(error) };
  }
  redirect(`/app/workouts/${id}`);
}

export async function startWorkout(formData: FormData): Promise<void> {
  const id = String(formData.get('id'));
  await serverApi().workouts.start(id);
  revalidatePath(`/app/workouts/${id}`);
}

export async function saveWorkoutResults(
  _state: WorkoutState,
  formData: FormData,
): Promise<WorkoutState> {
  const results = {
    ...resultsFromForm(formData),
    score: scoreFor(String(formData.get('type')) as never, formData),
  };
  const parsed = workoutResultsSchema.safeParse(results);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: '' };
  try {
    await serverApi().workouts.saveResults(String(formData.get('id')), parsed.data);
  } catch (error) {
    return { errors: {}, message: apiErrorMessage(error) };
  }
  return empty();
}

export async function completeWorkout(
  _state: WorkoutState,
  formData: FormData,
): Promise<WorkoutState> {
  const results = {
    ...resultsFromForm(formData),
    score: scoreFor(String(formData.get('type')) as never, formData),
  };
  let workoutId: string;
  try {
    workoutId = (await serverApi().workouts.complete(String(formData.get('id')), { results })).id;
  } catch (error) {
    if (error instanceof ApiError && error.code === 'WORKOUT_INCOMPLETE') {
      return { errors: {}, message: error.body.details?.join(' ') ?? error.message };
    }
    return { errors: {}, message: apiErrorMessage(error) };
  }
  revalidatePath('/app');
  revalidatePath('/app/workouts');
  redirect(`/app/workouts/${workoutId}`);
}

export async function removeWorkout(formData: FormData): Promise<void> {
  await serverApi().workouts.remove(String(formData.get('id')));
  revalidatePath('/app/workouts');
  redirect('/app/workouts');
}

export async function useWod(formData: FormData): Promise<void> {
  const workout = await serverApi().workouts.create({ wodSlug: String(formData.get('slug')) });
  redirect(`/app/workouts/${workout.id}`);
}
