import type { Metadata } from 'next';
import { ApiError } from '@garfit/api-client';
import Link from 'next/link';
import { AiPanel } from '@/components/ai-panel';
import { AiHistoryActions } from '@/components/ai-history-actions';
import { serverApi } from '@/lib/auth';
import { formatAnalysisHistoryRow } from '@/lib/ai-history';

export const metadata: Metadata = {
  title: 'Asistente IA',
};

export default async function AiPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; slug?: string; workoutId?: string }>;
}) {
  const api = serverApi();
  let status;
  try {
    status = await api.ai.status();
  } catch (error) {
    if (error instanceof ApiError) {
      return (
        <section className="mx-auto max-w-4xl space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Asistente IA</h1>
          <div className="rounded-2xl border border-line bg-surface p-6 text-muted">
            Servicio de análisis no configurado.
          </div>
        </section>
      );
    }
    throw error;
  }

  if (!status.enabled || !status.configured) {
    return (
      <section className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Asistente IA</h1>
        <div className="rounded-2xl border border-line bg-surface p-6 text-muted">
          Servicio de análisis no configurado.
        </div>
      </section>
    );
  }

  const [movements, wods, workouts, history, initial] = await Promise.all([
    api.movements.list({ limit: 30 }),
    api.wods.list({ limit: 30 }),
    api.workouts.list({ status: 'COMPLETED', limit: 1 }),
    api.ai.analyses.list({ page: 1, limit: 10 }),
    searchParams,
  ]);

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Asistente IA</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">
          Análisis explicativo de tu entrenamiento
        </h1>
        <p className="mt-2 text-sm text-muted">
          Las métricas las calcula GarFit; la IA sólo las interpreta con evidencia trazable.
        </p>
      </div>

      <AiPanel
        consentGivenAt={status.consentGivenAt}
        initial={initial}
        lastWorkout={workouts.items[0] ?? null}
        movements={movements.items}
        wods={wods.items}
      />

      <section className="space-y-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <h2 className="text-xl font-bold text-ink">Análisis recientes</h2>
          {history.items.length > 0 && <AiHistoryActions />}
        </div>
        {history.items.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-6 text-center text-sm text-muted">
            Aún no hay análisis guardados.
          </div>
        ) : (
          <ul className="space-y-3">
            {history.items.map((analysis) => {
              const row = formatAnalysisHistoryRow(analysis);
              return (
                <li
                  className="rounded-2xl border border-line bg-surface p-5 transition hover:border-line/80"
                  key={analysis.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      className="text-base font-bold text-accent no-underline hover:text-ink"
                      href={`/app/ai/analyses/${analysis.id}`}
                    >
                      {row.type} · {row.target}
                    </Link>
                    <span className="text-xs text-muted">{row.date}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted line-clamp-3">
                    {analysis.summary}
                  </p>
                  <div className="mt-3 border-t border-line/60 pt-3">
                    <AiHistoryActions id={analysis.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}
