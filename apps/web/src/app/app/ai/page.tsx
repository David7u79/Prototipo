import { ApiError } from '@garfit/api-client';
import { AiPanel } from '@/components/ai-panel';
import { serverApi } from '@/lib/auth';
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

  const [movements, wods, workouts, initial] = await Promise.all([
    api.movements.list({ limit: 30 }),
    api.wods.list({ limit: 30 }),
    api.workouts.list({ status: 'COMPLETED', limit: 1 }),
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
    </section>
  );
}
