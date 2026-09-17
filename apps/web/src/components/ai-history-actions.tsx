'use client';

import { useState } from 'react';
import { removeAiAnalysis, removeAllAiAnalyses } from '@/app/ai-actions';

export function AiHistoryActions({ id }: { id?: string }) {
  const [confirming, setConfirming] = useState(false);
  const action = id ? removeAiAnalysis.bind(null, id) : removeAllAiAnalyses;
  const label = id ? 'Borrar análisis' : 'Borrar todo el historial';

  if (confirming) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <span className="text-sm">¿Confirmas?</span>
        <form action={action}>
          <button className="text-sm underline">Sí, borrar</button>
        </form>
        <button className="text-sm underline" onClick={() => setConfirming(false)} type="button">
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button className="text-sm underline" onClick={() => setConfirming(true)} type="button">
      {label}
    </button>
  );
}
