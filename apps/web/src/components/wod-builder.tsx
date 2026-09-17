'use client';
import type { MovementSummary } from '@garfit/types';
import { WORKOUT_TYPE_LABELS } from '@garfit/validation';
import { useActionState, useEffect, useState } from 'react';
import { createWod, type WodState } from '@/app/wod-actions';
type Exercise = {
  movementSlug: string;
  name: string;
  reps: number | null;
  loadValue: number | null;
  loadUnit: string | null;
  distanceValue: number | null;
  distanceUnit: string | null;
  durationSeconds: number | null;
  notes: string | null;
};
const empty: WodState = { message: '', errors: {} };
export function WodBuilder() {
  const [items, setItems] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<MovementSummary[]>([]);
  const [state, action, pending] = useActionState(createWod, empty);
  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/app/workouts/movement-search?q=${encodeURIComponent(value)}`, {
        signal: controller.signal,
      });
      if (response.ok) setMatches((await response.json()) as MovementSummary[]);
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const update = (index: number, key: keyof Exercise, value: string | number | null) => {
    setItems(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };
  return (
    <form action={action} className="mt-6 space-y-5 rounded-2xl border border-line bg-panel p-5">
      <input
        name="exercises"
        type="hidden"
        value={JSON.stringify(items.map(({ name, ...item }) => item))}
      />
      <label>
        Nombre
        <input name="name" required />
      </label>
      <label>
        Tipo
        <select defaultValue="CUSTOM" name="workoutType">
          {Object.entries(WORKOUT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Descripción
        <textarea name="description" />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          Esquema
          <input name="repScheme" placeholder="21-15-9" />
        </label>
        <label>
          Rondas
          <input min="1" name="rounds" type="number" />
        </label>
        <label>
          Duración (s)
          <input min="1" name="durationSeconds" type="number" />
        </label>
      </div>
      <section aria-label="Movimientos">
        <h2 className="font-semibold">Movimientos</h2>
        <label>
          Buscar movimiento
          <input onChange={(event) => setQuery(event.target.value)} value={query} />
        </label>
        {query.trim().length >= 2 && matches.length > 0 && (
          <ul className="mt-2 rounded border border-line" role="listbox">
            {matches.map((m) => (
              <li key={m.slug}>
                <button
                  type="button"
                  onClick={() => {
                    setItems([
                      ...items,
                      {
                        movementSlug: m.slug,
                        name: m.name,
                        reps: null,
                        loadValue: null,
                        loadUnit: null,
                        distanceValue: null,
                        distanceUnit: null,
                        durationSeconds: null,
                        notes: null,
                      },
                    ]);
                    setQuery('');
                    setMatches([]);
                  }}
                >
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {items.map((item, index) => (
          <fieldset
            className="mt-4 grid gap-2 rounded border border-line p-3 sm:grid-cols-3"
            key={`${item.movementSlug}-${index}`}
          >
            <legend>
              {index + 1}. {item.name}
            </legend>
            <label>
              Repeticiones
              <input
                min="1"
                type="number"
                value={item.reps ?? ''}
                onChange={(e) =>
                  update(index, 'reps', e.target.value ? Number(e.target.value) : null)
                }
              />
            </label>
            <label>
              Carga
              <input
                min="1"
                type="number"
                value={item.loadValue ?? ''}
                onChange={(e) =>
                  update(index, 'loadValue', e.target.value ? Number(e.target.value) : null)
                }
              />
            </label>
            <label>
              Unidad de carga
              <select
                value={item.loadUnit ?? 'KILOGRAM'}
                onChange={(e) => update(index, 'loadUnit', e.target.value)}
              >
                <option>KILOGRAM</option>
                <option>POUND</option>
              </select>
            </label>
            <label>
              Distancia
              <input
                min="1"
                type="number"
                value={item.distanceValue ?? ''}
                onChange={(e) =>
                  update(index, 'distanceValue', e.target.value ? Number(e.target.value) : null)
                }
              />
            </label>
            <label>
              Unidad de distancia
              <select
                value={item.distanceUnit ?? 'METER'}
                onChange={(e) => update(index, 'distanceUnit', e.target.value)}
              >
                <option>METER</option>
                <option>KILOMETER</option>
                <option>MILE</option>
              </select>
            </label>
            <label>
              Duración (s)
              <input
                min="1"
                type="number"
                value={item.durationSeconds ?? ''}
                onChange={(e) =>
                  update(index, 'durationSeconds', e.target.value ? Number(e.target.value) : null)
                }
              />
            </label>
            <label className="sm:col-span-2">
              Notas
              <input
                value={item.notes ?? ''}
                onChange={(e) => update(index, 'notes', e.target.value || null)}
              />
            </label>
            <button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))}>
              Quitar
            </button>
          </fieldset>
        ))}
      </section>
      {state.message && <p role="alert">{state.message}</p>}
      <button className="rounded-lg bg-brand px-4 py-2 font-semibold text-white" disabled={pending}>
        Guardar WOD
      </button>
    </form>
  );
}
