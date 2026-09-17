'use server';

import type { AiAnalysisResponse } from '@garfit/types';
import { revalidatePath } from 'next/cache';
import { serverApi } from '@/lib/auth';
import { aiErrorMessage } from '@/lib/ai';

export type AiState = {
  message: string;
  analysis?: AiAnalysisResponse;
  consentGivenAt?: string | null;
};

async function run(operation: () => Promise<AiAnalysisResponse>): Promise<AiState> {
  try {
    return { message: '', analysis: await operation() };
  } catch (error) {
    return { message: aiErrorMessage(error) };
  }
}

export async function giveAiConsent(_state: AiState): Promise<AiState> {
  try {
    const consent = await serverApi().ai.giveConsent();
    revalidatePath('/app/ai');
    revalidatePath('/app/profile');
    return { message: '', consentGivenAt: consent.consentGivenAt };
  } catch (error) {
    return { message: aiErrorMessage(error) };
  }
}

export async function revokeAiConsent(): Promise<AiState> {
  try {
    await serverApi().ai.revokeConsent();
    revalidatePath('/app/ai');
    revalidatePath('/app/profile');
    return { message: 'Se revocó el consentimiento para análisis con IA.', consentGivenAt: null };
  } catch (error) {
    return { message: aiErrorMessage(error) };
  }
}
export async function revokeAiConsentFromProfile(): Promise<void> {
  try {
    await serverApi().ai.revokeConsent();
  } catch {
    return;
  }
  revalidatePath('/app/ai');
  revalidatePath('/app/profile');
}

export async function analyzeProgress(_state: AiState, formData: FormData) {
  return run(() =>
    serverApi().ai.analyzeProgress({
      periodDays: Number(formData.get('periodDays')) as 30 | 60 | 90,
    }),
  );
}
export async function analyzeWorkout(_state: AiState, formData: FormData) {
  return run(() => serverApi().ai.analyzeWorkout(String(formData.get('workoutId'))));
}
export async function explainWod(_state: AiState, formData: FormData) {
  return run(() => serverApi().ai.explainWod(String(formData.get('slug'))));
}
export async function explainMovement(_state: AiState, formData: FormData) {
  return run(() => serverApi().ai.explainMovement(String(formData.get('slug'))));
}
