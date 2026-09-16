'use server';

import { ApiError } from '@garfit/api-client';
import { loginSchema, registerSchema } from '@garfit/validation';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { serverApi, setSession } from '@/lib/auth';
import { authErrorMessage, safeNext } from '@/lib/auth-utils';

export type AuthState = {
  errors: Record<string, string[] | undefined>;
  message: string;
};

type AuthKind = 'login' | 'register';

function formInput(formData: FormData, includeName: boolean) {
  return {
    email: formData.get('email'),
    password: formData.get('password'),
    ...(includeName ? { name: formData.get('name') } : {}),
  };
}

async function submit(kind: AuthKind, formData: FormData): Promise<AuthState> {
  const parsed =
    kind === 'login'
      ? loginSchema.safeParse(formInput(formData, false))
      : registerSchema.safeParse(formInput(formData, true));

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: '' };
  }

  try {
    const response =
      kind === 'login'
        ? await serverApi().auth.login(loginSchema.parse(parsed.data))
        : await serverApi().auth.register(registerSchema.parse(parsed.data));
    setSession(await cookies(), response.tokens);
  } catch (error) {
    const code = error instanceof ApiError ? error.code : 'NETWORK_ERROR';
    return { errors: {}, message: authErrorMessage(code) };
  }

  const destination =
    kind === 'register' ? '/app/profile' : safeNext(String(formData.get('next') ?? ''));
  redirect(destination);
}

export async function loginAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  return submit('login', formData);
}

export async function registerAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  return submit('register', formData);
}
