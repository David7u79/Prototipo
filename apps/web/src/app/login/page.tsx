import { loginAction } from '@/app/auth-actions';
import { AuthForm } from '@/components/auth-form';
import { safeNext } from '@/lib/auth-utils';
import { serverApi } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  let googleClientId: string | null = null;
  try {
    const providers = await serverApi().auth.providers();
    googleClientId = providers.google.enabled ? providers.google.webClientId : null;
  } catch {}
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center p-5">
      <AuthForm action={loginAction} next={next} googleClientId={googleClientId} />
    </main>
  );
}
