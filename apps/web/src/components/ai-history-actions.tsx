'use client';

import { useState } from 'react';
import { removeAiAnalysis, removeAllAiAnalyses } from '@/app/ai-actions';

export function AiHistoryActions({ id }: { id?: string }) {
  const [confirming, setConfirming] = useState(false);
  const action = id ? removeAiAnalysis.bind(null, id) : removeAllAiAnalyses;
  const label = id ? 'Borrar análisis' : 'Borrar todo el historial';

  if (confirming) {
    return (
      <div className="mt-2 flex items-center gap-3">
        <span className="text-xs text-danger font-semibold">¿Confirmas?</span>
        <form action={action}>
          <button
            type="submit"
            className="rounded border border-danger/30 bg-danger/15 px-2.5 py-1 text-xs font-bold text-danger hover:bg-danger/25"
          >
            Sí, borrar
          </button>
        </form>
        <button
          className="text-xs text-muted hover:text-ink hover:underline"
          onClick={() => setConfirming(false)}
          type="button"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      className="text-xs font-semibold text-muted hover:text-danger hover:underline"
      onClick={() => setConfirming(true)}
      type="button"
    >
      {label}
    </button>
  );
}
