'use server';

import { ApiError } from '@garfit/api-client';
import {
  athleteProfileSchema,
  createRecordSchema,
  updateRecordSchemaFor,
} from '@garfit/validation';
import type { RecordType } from '@garfit/domain';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { clearSession, serverApi } from '@/lib/auth';
import { profileUnitFactors, toProfileMetric } from '@/lib/profile-units';
import { apiErrorMessage, recordInputValue } from '@/lib/records';

export type ProfileState = {
  errors: Record<string, string[] | undefined>;
  message: string;
};

export type RecordState = ProfileState;

export async function saveProfile(_state: ProfileState, formData: FormData): Promise<ProfileState> {
  const preferredUnits = formData.get('preferredUnits') === 'IMPERIAL' ? 'IMPERIAL' : 'METRIC';
  const parsed = athleteProfileSchema.safeParse({
    displayName: formData.get('displayName'),
    experienceLevel: formData.get('experienceLevel'),
    primaryGoal: formData.get('primaryGoal'),
    preferredUnits,
    birthDate: formData.get('birthDate') || null,
    heightCm: toProfileMetric(formData.get('height'), preferredUnits, profileUnitFactors.cm),
    weightKg: toProfileMetric(formData.get('weight'), preferredUnits, profileUnitFactors.kg),
    trainingSince: formData.get('trainingSince') || null,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: '' };
  }

  try {
    await serverApi().profile.upsert(parsed.data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect('/login');
    }

    return { errors: {}, message: 'No fue posible guardar tu perfil.' };
  }

  revalidatePath('/app');
  revalidatePath('/app/profile');
  return { errors: {}, message: 'Perfil guardado.' };
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('garfit_refresh')?.value;

  if (refreshToken) {
    try {
      await serverApi().auth.logout(refreshToken);
    } catch {
      // Ending the local session is still correct when the API is unavailable.
    }
  }

  clearSession(cookieStore);
  redirect('/login');
}

function recordFields(formData: FormData) {
  const recordType = formData.get('recordType') as RecordType;
  const repRaw = formData.get('repetitions');
  const repetitions = recordType === 'WEIGHT' ? (repRaw ? Number(repRaw) : null) : null;
  return {
    movementSlug: String(formData.get('movementSlug') ?? ''),
    recordType,
    value: recordInputValue(recordType, String(formData.get('value') ?? '')),
    unit: formData.get('unit'),
    repetitions,
    distanceValue: recordType === 'TIME' ? Number(formData.get('distanceValue')) : null,
    distanceUnit: recordType === 'TIME' ? formData.get('distanceUnit') : null,
    performedAt: formData.get('performedAt'),
    notes: formData.get('notes') || null,
  };
}

export async function createRecord(_state: RecordState, formData: FormData): Promise<RecordState> {
  const parsed = createRecordSchema.safeParse(recordFields(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: '' };
  try {
    await serverApi().records.create(parsed.data);
  } catch (error) {
    return { errors: {}, message: apiErrorMessage(error) };
  }
  revalidatePath('/app');
  revalidatePath('/app/records');
  revalidatePath(`/app/records/${parsed.data.movementSlug}`);
  redirect(`/app/records/${parsed.data.movementSlug}`);
}

export async function updateRecord(_state: RecordState, formData: FormData): Promise<RecordState> {
  const recordType = formData.get('recordType') as RecordType;
  // ponytail: la edición web aún no expone la distancia; la fase 3 la añade en el formulario.
  const parsed = updateRecordSchemaFor({
    recordType,
    distanceValue: nullableNumber(formData.get('existingDistanceValue')),
    distanceUnit: nullableDistanceUnit(formData.get('existingDistanceUnit')),
  }).safeParse({
    ...recordFields(formData),
    movementSlug: undefined,
    recordType: undefined,
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: '' };
  try {
    await serverApi().records.update(String(formData.get('id')), parsed.data);
  } catch (error) {
    return { errors: {}, message: apiErrorMessage(error) };
  }
  const movementSlug = String(formData.get('movementSlug'));
  revalidatePath('/app');
  revalidatePath('/app/records');
  revalidatePath(`/app/records/${movementSlug}`);
  redirect(`/app/records/${movementSlug}`);
}

export async function removeRecord(formData: FormData): Promise<void> {
  const movementSlug = String(formData.get('movementSlug'));
  await serverApi().records.remove(String(formData.get('id')));
  revalidatePath('/app');
  revalidatePath('/app/records');
  revalidatePath(`/app/records/${movementSlug}`);
  redirect(`/app/records/${movementSlug}`);
}

function nullableNumber(value: FormDataEntryValue | null): number | null {
  if (!value) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function nullableDistanceUnit(value: FormDataEntryValue | null) {
  return value === 'METER' || value === 'KILOMETER' || value === 'MILE' ? value : null;
}
