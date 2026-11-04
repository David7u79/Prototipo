'use client';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <h1 className="text-xl font-bold text-ink">No pudimos cargar los movimientos</h1>
      <p className="mt-2 text-sm text-muted">
        Ocurrió un error al obtener la lista de movimientos.
      </p>
      <button
        type="button"
        className="btn-primary mt-4"
        onClick={reset}
      >
        Reintentar
      </button>
    </section>
  );
}
