'use client';

import {
  formatDuration,
  UNITS_BY_RECORD_TYPE,
  type RecordType,
  type RecordUnit,
  type UnitSystem,
} from '@garfit/domain';
import { RECORD_TYPE_LABELS, RECORD_UNIT_LABELS } from '@garfit/validation';
import { useActionState, useState } from 'react';
import { createRecord, updateRecord, type RecordState } from '@/app/app-actions';

const EMPTY: RecordState = { errors: {}, message: '' };

type Props = {
  movementSlug: string;
  recordTypes: RecordType[];
  units: UnitSystem;
  record?: {
    id: string;
    recordType: RecordType;
    value: number;
    unit: RecordUnit;
    repetitions: number | null;
    distanceValue: number | null;
    distanceUnit: 'METER' | 'KILOMETER' | 'MILE' | null;
    performedAt: string;
    notes: string | null;
  };
};

export function RecordForm({ movementSlug, recordTypes, units, record }: Props) {
  const [recordType, setRecordType] = useState(record?.recordType ?? recordTypes[0]);
  const [state, action, pending] = useActionState(record ? updateRecord : createRecord, EMPTY);
  const isTime = recordType === 'TIME' || recordType === 'DURATION';
  const defaultUnit =
    units === 'IMPERIAL' && recordType === 'WEIGHT' ? 'POUND' : UNITS_BY_RECORD_TYPE[recordType][0];

  const initialValue = record ? (isTime ? formatDuration(record.value) : record.value) : undefined;

  return (
    <form action={action} className="mt-6 space-y-4 rounded-2xl border border-line bg-panel p-5">
      <input name="movementSlug" type="hidden" value={movementSlug} />
      {record && <input name="id" type="hidden" value={record.id} />}
      {record && (
        <input name="existingDistanceValue" type="hidden" value={record.distanceValue ?? ''} />
      )}
      {record && (
        <input name="existingDistanceUnit" type="hidden" value={record.distanceUnit ?? ''} />
      )}
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="recordType">
          Tipo de marca
        </label>
        <select
          defaultValue={recordType}
          disabled={Boolean(record)}
          id="recordType"
          name="recordType"
          onChange={(event) => setRecordType(event.target.value as RecordType)}
        >
          {recordTypes.map((type) => (
            <option key={type} value={type}>
              {RECORD_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        {record && <input name="recordType" type="hidden" value={recordType} />}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="value">
          {isTime ? 'Tiempo (mm:ss)' : 'Valor'}
        </label>
        <input
          aria-describedby={state.errors.value ? 'value-error' : undefined}
          defaultValue={initialValue}
          id="value"
          name="value"
          placeholder={isTime ? '05:30' : undefined}
          required
        />
        <FieldError messages={state.errors.value} name="value" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="unit">
          Unidad
        </label>
        <select
          aria-describedby={state.errors.unit ? 'unit-error' : undefined}
          defaultValue={record?.unit ?? defaultUnit}
          id="unit"
          key={recordType}
          name="unit"
        >
          {UNITS_BY_RECORD_TYPE[recordType].map((unit) => (
            <option key={unit} value={unit}>
              {RECORD_UNIT_LABELS[unit]}
            </option>
          ))}
        </select>
        <FieldError messages={state.errors.unit} name="unit" />
      </div>
      {recordType === 'WEIGHT' && (
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="repetitions">
            Repeticiones
          </label>
          <input
            aria-describedby={state.errors.repetitions ? 'repetitions-error' : undefined}
            defaultValue={record?.repetitions ?? 1}
            id="repetitions"
            max="100"
            min="1"
            name="repetitions"
            required
            type="number"
          />
          <FieldError messages={state.errors.repetitions} name="repetitions" />
        </div>
      )}
      {recordType === 'TIME' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="distanceValue">
              Distancia
            </label>
            <input
              defaultValue={record?.distanceValue ?? ''}
              id="distanceValue"
              inputMode="decimal"
              min="0"
              name="distanceValue"
              required
              type="number"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="distanceUnit">
              Unidad de distancia
            </label>
            <select
              defaultValue={record?.distanceUnit ?? 'KILOMETER'}
              id="distanceUnit"
              name="distanceUnit"
            >
              {(['METER', 'KILOMETER', 'MILE'] as const).map((unit) => (
                <option key={unit} value={unit}>
                  {RECORD_UNIT_LABELS[unit]}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="performedAt">
          Fecha
        </label>
        <input
          aria-describedby={state.errors.performedAt ? 'performedAt-error' : undefined}
          defaultValue={record?.performedAt ?? new Date().toISOString().slice(0, 10)}
          id="performedAt"
          max={new Date().toISOString().slice(0, 10)}
          name="performedAt"
          required
          type="date"
        />
        <FieldError messages={state.errors.performedAt} name="performedAt" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="notes">
          Notas (opcional)
        </label>
        <textarea
          aria-describedby={state.errors.notes ? 'notes-error' : undefined}
          className="w-full rounded-lg border border-line p-3"
          defaultValue={record?.notes ?? ''}
          id="notes"
          maxLength={500}
          name="notes"
          rows={3}
        />
        <FieldError messages={state.errors.notes} name="notes" />
      </div>
      {state.message && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {state.message}
        </p>
      )}
      <button
        className="rounded-lg bg-brand px-4 py-2 font-semibold text-white disabled:opacity-50"
        disabled={pending}
      >
        {pending ? 'Guardando…' : 'Guardar marca'}
      </button>
    </form>
  );
}

function FieldError({ messages, name }: { messages?: string[]; name: string }) {
  return messages?.map((message) => (
    <p className="mt-1 text-sm text-red-700" id={`${name}-error`} key={message}>
      {message}
    </p>
  ));
}
