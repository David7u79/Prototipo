import {
  displayUnitFor,
  formatRecordValue,
  parseDuration,
  type RecordType,
  type UnitSystem,
} from '@garfit/domain';
import type { ApiError } from '@garfit/api-client';

export function formatValue(type: RecordType, value: number, system: UnitSystem): string {
  return formatRecordValue(type, value, displayUnitFor(type, system, value));
}

export function formatChange(type: RecordType, value: number, system: UnitSystem): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatValue(type, Math.abs(value), system)}`;
}

export function parseRecordValue(type: RecordType, text: string): number | null {
  if (type === 'TIME' || type === 'DURATION') return parseDuration(text);
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

export function profileDisplayValue(
  value: number | null,
  unit: UnitSystem,
  kind: 'weight' | 'height',
) {
  if (value === null) return '';
  const converted =
    unit === 'IMPERIAL' ? (kind === 'weight' ? value / 0.45359237 : value / 2.54) : value;
  return String(Math.round(converted * 10) / 10);
}

export function profileCanonicalValue(value: string, unit: UnitSystem, kind: 'weight' | 'height') {
  if (!value.trim()) return null;
  const numberValue = Number(value.replace(',', '.'));
  if (!Number.isFinite(numberValue)) return Number.NaN;
  if (unit !== 'IMPERIAL') return numberValue;
  return kind === 'weight' ? numberValue * 0.45359237 : numberValue * 2.54;
}

export function apiMessage(error: ApiError | { code?: string; message: string }): string {
  const messages: Record<string, string> = {
    MOVEMENT_NOT_FOUND: 'No encontramos este movimiento.',
    RECORD_NOT_FOUND: 'No encontramos esta marca.',
    RECORD_TYPE_NOT_ALLOWED: 'Este tipo de marca no está permitido para el movimiento.',
    INVALID_RECORD_VALUE: 'El valor o la unidad no son válidos.',
    VALIDATION_FAILED: 'Revisa los campos marcados.',
    PROFILE_NOT_FOUND: 'Completa tu perfil deportivo.',
    UNAUTHORIZED: 'Tu sesión venció. Vuelve a iniciar sesión.',
    NETWORK_ERROR: 'No fue posible conectar con el servidor.',
  };
  return messages[error.code ?? ''] ?? error.message;
}

export function evolutionWidth(value: number, values: number[]): `${number}%` {
  const low = Math.min(...values);
  const high = Math.max(...values);
  if (high === low) return '50%';
  return `${20 + ((value - low) / (high - low)) * 80}%`;
}
