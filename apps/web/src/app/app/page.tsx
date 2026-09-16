import Link from 'next/link';
import { ApiError } from '@garfit/api-client';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/auth';

async function dashboardData() {
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
export default async function Dashboard() {
  const [user, profile] = await dashboardData();
  return (
    <section className="mx-auto max-w-4xl">
      <p className="text-sm font-semibold text-brand">Tu espacio deportivo</p>
      <h1 className="mt-1 text-3xl font-bold">Hola{user.name ? `, ${user.name}` : ''}</h1>
      {!profile && (
        <div className="mt-6 rounded-2xl border border-brand/25 bg-emerald-50 p-5">
          <p className="font-semibold">Completa tu perfil deportivo.</p>
          <Link
            href="/app/profile"
            className="mt-2 inline-block text-sm font-semibold text-brand underline"
          >
            Ir a mi perfil
          </Link>
        </div>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="font-semibold">Entrenamientos</h2>
          <p className="mt-3 text-sm text-muted">No has registrado entrenamientos.</p>
        </article>
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="font-semibold">Marcas personales</h2>
          <p className="mt-3 text-sm text-muted">No hay marcas personales registradas.</p>
        </article>
      </div>
    </section>
  );
}
