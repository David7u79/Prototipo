import { ApiError } from '@garfit/api-client';
import { redirect } from 'next/navigation';
import { ProfileForm } from '@/components/profile-form';
import { serverApi } from '@/lib/auth';
import { revokeAiConsentFromProfile } from '@/app/ai-actions';

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
    <section className="mx-auto max-w-2xl">
      <p className="text-sm font-semibold text-brand">Cuenta</p>
      <h1 className="mt-1 text-3xl font-bold">Perfil del atleta</h1>
      <div className="mt-6 rounded-2xl border border-line bg-panel p-5">
        <p className="text-sm text-muted">Correo electrónico</p>
        <p className="font-medium">{user.email}</p>
        <p className="mt-4 text-sm text-muted">Proveedores vinculados</p>
        <p className="font-medium">
          {user.providers.length ? user.providers.join(', ') : 'Sin proveedores registrados'}
        </p>
      </div>
      <ProfileForm profile={profile} />
      {aiStatus?.consentGivenAt && (
        <section className="mt-6 rounded-2xl border border-line bg-panel p-5">
          <h2 className="font-semibold">Análisis con IA</h2>
          <p className="mt-2 text-sm text-muted">
            Al revocar el consentimiento, GarFit dejará de enviar tus datos deportivos al proveedor
            para nuevos análisis.
          </p>
          <form action={revokeAiConsentFromProfile} className="mt-3">
            <button className="underline">Revocar consentimiento</button>
          </form>
        </section>
      )}
    </section>
  );
}
