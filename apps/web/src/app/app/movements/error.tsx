'use client';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-line bg-panel p-6">
      <h1 className="text-xl font-bold">No pudimos cargar los movimientos</h1>
      <button
        className="mt-4 rounded-lg bg-brand px-4 py-2 font-semibold text-white"
        onClick={reset}
      >
        Reintentar
      </button>
    </section>
  );
}
