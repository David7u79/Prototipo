import Link from 'next/link';
import { GarFitLogo } from '@/components/logo';

export default function AppNotFound() {
  return (
    <section className="mx-auto my-16 max-w-md rounded-2xl border border-line bg-surface p-6 text-center sm:p-8">
      <div className="mb-4 flex justify-center">
        <GarFitLogo size={48} />
      </div>
      <h1 className="text-2xl font-bold text-ink">Página no encontrada</h1>
      <p className="mt-2 text-sm text-muted">
        El recurso o página que buscas no existe o fue movido.
      </p>
      <div className="mt-6 flex justify-center">
        <Link href="/app" className="btn-primary">
          Volver al inicio
        </Link>
      </div>
    </section>
  );
}
