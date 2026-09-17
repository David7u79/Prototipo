'use server';
import { createWodSchema } from '@garfit/validation';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/auth';
import { apiErrorMessage } from '@/lib/records';
export type WodState = { message: string; errors: Record<string, string[] | undefined> };
function number(value: FormDataEntryValue | null) {
  return value === null || value === '' ? null : Number(value);
}
export async function createWod(_state: WodState, formData: FormData): Promise<WodState> {
  let exercises: unknown[];
  try {
    exercises = JSON.parse(String(formData.get('exercises') ?? '[]'));
  } catch {
    return { message: 'Los movimientos no son válidos.', errors: {} };
  }
  const parsed = createWodSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || null,
    workoutType: formData.get('workoutType'),
    repScheme: String(formData.get('repScheme') ?? '')
      .split('-')
      .filter(Boolean)
      .map(Number),
    rounds: number(formData.get('rounds')),
    durationSeconds: number(formData.get('durationSeconds')),
    intervalSeconds: null,
    exercises,
  });
  if (!parsed.success) return { message: '', errors: parsed.error.flatten().fieldErrors };
  let wod;
  try {
    wod = await serverApi().wods.create(parsed.data);
  } catch (error) {
    return { message: apiErrorMessage(error), errors: {} };
  }
  redirect(`/app/wods/${wod.slug}`);
}
