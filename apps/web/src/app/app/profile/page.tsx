import type { Metadata } from 'next';
import { ApiError } from '@garfit/api-client';
import { redirect } from 'next/navigation';
import { ProfileForm } from '@/components/profile-form';
import { serverApi } from '@/lib/auth';
import { revokeAiConsentFromProfile } from '@/app/ai-actions';

export const metadata: Metadata = {
  title: 'Perfil deportivo',
};

async function profileData() {
  try {
    const api = serverApi();
    return await Promise.all([
      api.auth.me(),
      api.profile.get().catch((error: unknown) => {
        if (error instanceof ApiError && error.code === 'PROFILE_NOT_FOUND') return null;
        throw error;
      }),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    throw error;
  }
}

export default async function ProfilePage() {
  const [user, profile] = await profileData();
  const aiStatus = await serverApi()
    .ai.status()
    .catch(() => null);

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Cuenta</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">Perfil del atleta</h1>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Correo electrónico</p>
        <p className="mt-1 font-medium text-ink">{user.email}</p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">Proveedores vinculados</p>
        <p className="mt-1 font-medium text-ink">
          {user.providers.length ? user.providers.join(', ') : 'Sin proveedores registrados'}
        </p>
      </div>

      <ProfileForm profile={profile} />

      {aiStatus?.consentGivenAt && (
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-base font-bold text-ink">Análisis con IA</h2>
          <p className="mt-2 text-sm text-muted">
            Al revocar el consentimiento, GarFit dejará de enviar tus datos deportivos al proveedor
            para nuevos análisis.
          </p>
          <form action={revokeAiConsentFromProfile} className="mt-4">
            <button
              type="submit"
              className="rounded-[10px] border border-danger/30 bg-danger/10 px-4 py-2 text-xs font-bold text-danger transition hover:bg-danger/20"
            >
              Revocar consentimiento
            </button>
          </form>
        </section>
      )}
    </section>
  );
}
