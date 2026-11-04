'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es" className="h-full">
      <body className="flex min-h-full flex-col items-center justify-center bg-[#0A0D18] p-6 font-sans text-[#EEF1FA]">
        <div className="max-w-md rounded-2xl border border-[#232A42] bg-[#131829] p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#FB7185]/30 bg-[#FB7185]/15 text-xl font-bold text-[#FB7185]">
            !
          </div>
          <h1 className="mt-4 text-2xl font-bold text-[#EEF1FA]">Error crítico</h1>
          <p className="mt-2 text-sm text-[#8A93AD]">
            {error?.message || 'Ocurrió un error inesperado en la aplicación.'}
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-[10px] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#6A4BF0]/25 transition hover:opacity-95"
              style={{ background: 'linear-gradient(135deg, #6A4BF0 0%, #0E8FB0 100%)' }}
            >
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
