'use server';

import { ApiError } from '@garfit/api-client';
import { athleteProfileSchema } from '@garfit/validation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { clearSession, serverApi } from '@/lib/auth';

export type ProfileState = {
  errors: Record<string, string[] | undefined>;
  message: string;
};

export async function saveProfile(_state: ProfileState, formData: FormData): Promise<ProfileState> {
  const parsed = athleteProfileSchema.safeParse({
    displayName: formData.get('displayName'),
    experienceLevel: formData.get('experienceLevel'),
    primaryGoal: formData.get('primaryGoal'),
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
