import {
  displayUnitFor,
  formatRecordValue,
  parseDuration,
  type RecordType,
  type UnitSystem,
} from '@garfit/domain';
import { ApiError } from '@garfit/api-client';

export function formatValue(recordType: RecordType, value: number, system: UnitSystem): string {
  return formatRecordValue(recordType, value, displayUnitFor(recordType, system, value));
}

export function formatChange(recordType: RecordType, value: number, system: UnitSystem): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  const formatted = formatValue(recordType, Math.abs(value), system);
  return `${sign}${formatted}`;
}

export function recordInputValue(recordType: RecordType, value: string): number | null {
  if (recordType === 'TIME' || recordType === 'DURATION') return parseDuration(value);
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No fue posible completar la operación.';
  const messages: Record<string, string> = {
    VALIDATION_FAILED: 'Revisa los datos indicados.',
    MOVEMENT_NOT_FOUND: 'No encontramos ese movimiento.',
    RECORD_NOT_FOUND: 'No encontramos esa marca.',
    RECORD_TYPE_NOT_ALLOWED: 'Ese tipo de marca no está permitido para este movimiento.',
    RECORD_MANAGED_BY_WORKOUT: 'Esta marca se gestiona desde el entrenamiento que la originó.',
    WORKOUT_NOT_FOUND: 'No encontramos ese entrenamiento.',
    WORKOUT_INVALID_STATE: 'Esta acción no está permitida en el estado actual.',
    WORKOUT_INCOMPLETE: 'Faltan resultados para completar el entrenamiento.',
    WOD_NOT_FOUND: 'No encontramos ese WOD.',
    INVALID_RECORD_VALUE: 'El valor o la unidad no son válidos.',
    PROFILE_NOT_FOUND: 'Completa primero tu perfil deportivo.',
    UNAUTHORIZED: 'Tu sesión ha terminado. Inicia sesión de nuevo.',
    NETWORK_ERROR: 'No pudimos conectar con el servicio. Inténtalo de nuevo.',
  };
  return messages[error.code] ?? 'No fue posible completar la operación.';
}
