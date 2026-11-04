import type { Metadata } from 'next';
import { registerAction } from '@/app/auth-actions';
import { AuthForm } from '@/components/auth-form';
import { serverApi } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Crear cuenta',
};

export const dynamic = 'force-dynamic';

export default async function Register() {
  let googleClientId: string | null = null;
  try {
    const providers = await serverApi().auth.providers();
    googleClientId = providers.google.enabled ? providers.google.webClientId : null;
  } catch {}

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center p-4 sm:p-6">
      <AuthForm action={registerAction} register googleClientId={googleClientId} />
    </main>
  );
}
