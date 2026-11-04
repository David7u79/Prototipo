'use client';

import Link from 'next/link';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto my-12 max-w-xl rounded-2xl border border-line bg-surface p-6 text-center sm:p-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-danger/30 bg-danger/15 text-xl font-bold text-danger">
        !
      </div>
      <h1 className="mt-4 text-2xl font-bold text-ink">Ha ocurrido un error inesperado</h1>
      <p className="mt-2 text-sm text-muted">
        {error?.message || 'No fue posible completar la operación. Por favor, intenta de nuevo.'}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          Reintentar
        </button>
        <Link href="/app" className="btn-secondary">
          Volver al inicio
        </Link>
      </div>
    </section>
  );
}
