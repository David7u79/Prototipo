import { ApiError } from '@garfit/api-client';
import Link from 'next/link';
import { AiPanel } from '@/components/ai-panel';
import { AiHistoryActions } from '@/components/ai-history-actions';
import { serverApi } from '@/lib/auth';
import { formatAnalysisHistoryRow } from '@/lib/ai-history';
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
        <section>
          <h1 className="text-3xl font-bold">Asistente IA</h1>
          <p className="mt-5">Servicio de análisis no configurado.</p>
        </section>
      );
    }

    throw error;
  }

  if (!status.enabled || !status.configured) {
    return (
      <section>
        <h1 className="text-3xl font-bold">Asistente IA</h1>
        <p className="mt-5">Servicio de análisis no configurado.</p>
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
    <section className="mx-auto max-w-4xl">
      <p className="text-sm font-semibold text-brand">Asistente IA</p>
      <h1 className="mt-1 text-3xl font-bold">Análisis explicativo de tu entrenamiento</h1>
      <p className="mt-3 text-muted">
        Las métricas las calcula GarFit; la IA sólo las interpreta con evidencia trazable.
      </p>
      <AiPanel
        consentGivenAt={status.consentGivenAt}
        initial={initial}
        lastWorkout={workouts.items[0] ?? null}
        movements={movements.items}
        wods={wods.items}
      />
      <section className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Análisis recientes</h2>
          {history.items.length > 0 && <AiHistoryActions />}
        </div>
        {history.items.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aún no hay análisis guardados.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {history.items.map((analysis) => {
              const row = formatAnalysisHistoryRow(analysis);
              return (
                <li className="rounded-xl border border-line p-4" key={analysis.id}>
                  <Link
                    className="font-semibold underline"
                    href={`/app/ai/analyses/${analysis.id}`}
                  >
                    {row.type} · {row.target}
                  </Link>
                  <p className="text-sm text-muted">{row.date}</p>
                  <p className="mt-1 whitespace-pre-line text-sm">{analysis.summary}</p>
                  <AiHistoryActions id={analysis.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}
