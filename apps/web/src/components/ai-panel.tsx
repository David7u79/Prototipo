'use client';
import type { MovementSummary, WodSummary, WorkoutListItem } from '@garfit/types';
import { useActionState } from 'react';
import {
  analyzeProgress,
  analyzeWorkout,
  explainMovement,
  explainWod,
  giveAiConsent,
  type AiState,
} from '@/app/ai-actions';
import { AiAnalysis } from '@/components/ai-analysis';
const empty: AiState = { message: '' };
export function AiPanel({
  consentGivenAt,
  movements,
  wods,
  lastWorkout,
  initial,
}: {
  consentGivenAt: string | null;
  movements: MovementSummary[];
  wods: WodSummary[];
  lastWorkout: WorkoutListItem | null;
  initial?: { type?: string; slug?: string; workoutId?: string };
}) {
  const consent = consentGivenAt;
  const [consentState, consentAction, consenting] = useActionState(giveAiConsent, empty);
  const [progress, progressAction, progressing] = useActionState(analyzeProgress, empty);
  const [workout, workoutAction, working] = useActionState(analyzeWorkout, empty);
  const [wod, wodAction, wodding] = useActionState(explainWod, empty);
  const [movement, movementAction, moving] = useActionState(explainMovement, empty);
  const state =
    [progress, workout, wod, movement].find((item) => item.analysis || item.message) ?? empty;
  if (!consent && !consentState.consentGivenAt)
    return (
      <div className="mt-6 rounded-2xl border border-line bg-panel p-5">
        <p>
          GarFit utiliza Google Gemini para generar análisis. Al solicitar un análisis, los datos
          deportivos necesarios para esa operación se enviarán al proveedor de IA. No se envían tus
          credenciales de acceso.
        </p>
        <form action={consentAction} className="mt-4 flex gap-3">
          <button
            className="rounded-lg bg-brand px-4 py-2 font-semibold text-white"
            disabled={consenting}
          >
            Aceptar y continuar
          </button>
          <button type="button" onClick={() => history.back()}>
            Cancelar
          </button>
        </form>
        {consentState.message && <p role="alert">{consentState.message}</p>}
      </div>
    );
  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <form action={progressAction} className="rounded-2xl border border-line bg-panel p-4">
          <h2 className="font-semibold">Analizar mi progreso</h2>
          <select aria-label="Periodo" defaultValue="30" name="periodDays">
            <option value="30">30 días</option>
            <option value="60">60 días</option>
            <option value="90">90 días</option>
          </select>
          <button className="mt-3 block underline" disabled={progressing}>
            Analizar mi progreso
          </button>
        </form>
        <form action={workoutAction} className="rounded-2xl border border-line bg-panel p-4">
          <h2 className="font-semibold">Analizar mi último entrenamiento</h2>
          {lastWorkout ? (
            <>
              <input name="workoutId" type="hidden" value={initial?.workoutId ?? lastWorkout.id} />
              <p>{lastWorkout.name}</p>
              <button className="mt-3 underline" disabled={working}>
                Analizar mi último entrenamiento
              </button>
            </>
          ) : (
            <p>Aún no hay entrenamientos completados.</p>
          )}
        </form>
        <form action={wodAction} className="rounded-2xl border border-line bg-panel p-4">
          <h2 className="font-semibold">Explicar un WOD</h2>
          <select
            aria-label="WOD"
            defaultValue={initial?.type === 'wod' ? initial.slug : undefined}
            name="slug"
          >
            {wods.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
          <button className="mt-3 block underline" disabled={wodding}>
            Explicar un WOD
          </button>
        </form>
        <form action={movementAction} className="rounded-2xl border border-line bg-panel p-4">
          <h2 className="font-semibold">Explicar un movimiento</h2>
          <select
            aria-label="Movimiento"
            defaultValue={initial?.type === 'movement' ? initial.slug : undefined}
            name="slug"
          >
            {movements.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
          <button className="mt-3 block underline" disabled={moving}>
            Explicar un movimiento
          </button>
        </form>
      </div>
      {state.message && (
        <p className="mt-4" role="alert">
          {state.message}
        </p>
      )}
      {state.analysis && <AiAnalysis analysis={state.analysis} />}
    </>
  );
}
