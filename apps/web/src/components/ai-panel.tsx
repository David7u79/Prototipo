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
      <div className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-bold text-ink">Consentimiento de análisis deportivo</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          GarFit utiliza Google Gemini para generar análisis. Al solicitar un análisis, los datos
          deportivos necesarios para esa operación se enviarán al proveedor de IA. No se envían tus
          credenciales de acceso.
        </p>
        <form action={consentAction} className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            className="btn-primary"
            disabled={consenting}
          >
            {consenting ? 'Procesando…' : 'Aceptar y continuar'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => history.back()}>
            Cancelar
          </button>
        </form>
        {consentState.message && (
          <p className="mt-3 rounded-[10px] border border-danger/30 bg-danger/15 p-3 text-sm text-danger" role="alert">
            {consentState.message}
          </p>
        )}
      </div>
    );

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <form action={progressAction} className="rounded-2xl border border-line bg-surface p-5 space-y-3">
          <h2 className="font-bold text-ink">Analizar mi progreso</h2>
          <select aria-label="Periodo" defaultValue="30" name="periodDays">
            <option value="30">Últimos 30 días</option>
            <option value="60">Últimos 60 días</option>
            <option value="90">Últimos 90 días</option>
          </select>
          <button type="submit" className="text-sm font-semibold text-accent hover:underline disabled:opacity-50" disabled={progressing}>
            {progressing ? 'Analizando…' : 'Analizar mi progreso →'}
          </button>
        </form>

        <form action={workoutAction} className="rounded-2xl border border-line bg-surface p-5 space-y-3">
          <h2 className="font-bold text-ink">Analizar mi último entrenamiento</h2>
          {lastWorkout ? (
            <>
              <input name="workoutId" type="hidden" value={initial?.workoutId ?? lastWorkout.id} />
              <p className="text-sm font-medium text-ink">{lastWorkout.name}</p>
              <button type="submit" className="text-sm font-semibold text-accent hover:underline disabled:opacity-50" disabled={working}>
                {working ? 'Analizando…' : 'Analizar mi último entrenamiento →'}
              </button>
            </>
          ) : (
            <p className="text-sm text-muted">Aún no hay entrenamientos completados.</p>
          )}
        </form>

        <form action={wodAction} className="rounded-2xl border border-line bg-surface p-5 space-y-3">
          <h2 className="font-bold text-ink">Explicar un WOD</h2>
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
          <button type="submit" className="text-sm font-semibold text-accent hover:underline disabled:opacity-50" disabled={wodding}>
            {wodding ? 'Consultando…' : 'Explicar este WOD →'}
          </button>
        </form>

        <form action={movementAction} className="rounded-2xl border border-line bg-surface p-5 space-y-3">
          <h2 className="font-bold text-ink">Explicar un movimiento</h2>
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
          <button type="submit" className="text-sm font-semibold text-accent hover:underline disabled:opacity-50" disabled={moving}>
            {moving ? 'Consultando…' : 'Explicar este movimiento →'}
          </button>
        </form>
      </div>

      {state.message && (
        <p className="mt-4 rounded-[10px] border border-danger/30 bg-danger/15 p-3 text-sm text-danger" role="alert">
          {state.message}
        </p>
      )}

      {state.analysis && <AiAnalysis analysis={state.analysis} />}
    </>
  );
}
