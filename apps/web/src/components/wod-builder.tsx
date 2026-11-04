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
    <form action={action} className="mt-6 space-y-5 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <input
        name="exercises"
        type="hidden"
        value={JSON.stringify(
          items.map((item) => {
            const { name: _ignored, ...rest } = item;
            void _ignored;
            return rest;
          }),
        )}
      />
      <div>
        <label className="mb-1 block text-sm font-medium text-ink" htmlFor="wod-name">
          Nombre
        </label>
        <input id="wod-name" name="name" required />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink" htmlFor="wod-type">
          Tipo
        </label>
        <select defaultValue="CUSTOM" id="wod-type" name="workoutType">
          {Object.entries(WORKOUT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink" htmlFor="wod-description">
          Descripción
        </label>
        <textarea id="wod-description" name="description" rows={3} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink" htmlFor="wod-repScheme">
            Esquema
          </label>
          <input id="wod-repScheme" name="repScheme" placeholder="21-15-9" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink" htmlFor="wod-rounds">
            Rondas
          </label>
          <input id="wod-rounds" min="1" name="rounds" type="number" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink" htmlFor="wod-durationSeconds">
            Duración (s)
          </label>
          <input id="wod-durationSeconds" min="1" name="durationSeconds" type="number" />
        </div>
      </div>
      <section aria-label="Movimientos" className="space-y-4 pt-2">
        <h2 className="text-base font-bold text-ink">Movimientos del WOD</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink" htmlFor="movement-search">
            Buscar movimiento para añadir
          </label>
          <input
            id="movement-search"
            onChange={(event) => setQuery(event.target.value)}
            value={query}
            placeholder="Escribe al menos 2 letras..."
          />
        </div>
        {query.trim().length >= 2 && matches.length > 0 && (
          <ul className="divide-y divide-line rounded-[10px] border border-line bg-raised" role="listbox">
            {matches.map((m) => (
              <li key={m.slug}>
                <button
                  type="button"
                  className="w-full justify-start rounded-none border-none bg-transparent px-4 py-2.5 text-left text-sm font-medium text-ink hover:bg-surface hover:text-accent"
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
            className="grid gap-3 rounded-xl border border-line bg-raised/40 p-4 sm:grid-cols-3"
            key={`${item.movementSlug}-${index}`}
          >
            <legend className="px-2 text-sm font-bold text-accent">
              {index + 1}. {item.name}
            </legend>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Repeticiones</label>
              <input
                min="1"
                type="number"
                value={item.reps ?? ''}
                onChange={(e) =>
                  update(index, 'reps', e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Carga</label>
              <input
                min="1"
                type="number"
                value={item.loadValue ?? ''}
                onChange={(e) =>
                  update(index, 'loadValue', e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Unidad de carga</label>
              <select
                value={item.loadUnit ?? 'KILOGRAM'}
                onChange={(e) => update(index, 'loadUnit', e.target.value)}
              >
                <option value="KILOGRAM">KILOGRAM</option>
                <option value="POUND">POUND</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Distancia</label>
              <input
                min="1"
                type="number"
                value={item.distanceValue ?? ''}
                onChange={(e) =>
                  update(index, 'distanceValue', e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Unidad de distancia</label>
              <select
                value={item.distanceUnit ?? 'METER'}
                onChange={(e) => update(index, 'distanceUnit', e.target.value)}
              >
                <option value="METER">METER</option>
                <option value="KILOMETER">KILOMETER</option>
                <option value="MILE">MILE</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Duración (s)</label>
              <input
                min="1"
                type="number"
                value={item.durationSeconds ?? ''}
                onChange={(e) =>
                  update(index, 'durationSeconds', e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted">Notas</label>
              <input
                value={item.notes ?? ''}
                onChange={(e) => update(index, 'notes', e.target.value || null)}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className="rounded-[10px] border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-bold text-danger hover:bg-danger/20"
                onClick={() => setItems(items.filter((_, i) => i !== index))}
              >
                Quitar ejercicio
              </button>
            </div>
          </fieldset>
        ))}
      </section>
      {state.message && (
        <p className="rounded-[10px] border border-danger/30 bg-danger/15 p-3 text-sm text-danger" role="alert">
          {state.message}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={pending}>
        Guardar WOD
      </button>
    </form>
  );
}
