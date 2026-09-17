import type { RecordType, RecordUnit, UnitSystem } from './rules.js';
import { UNITS_BY_RECORD_TYPE } from './rules.js';

/** Factores exactos de conversión a la unidad canónica de cada tipo. */
const TO_CANONICAL: Record<RecordUnit, number> = {
  KILOGRAM: 1,
  POUND: 0.45359237, // definición internacional de la libra
  REPETITION: 1,
  METER: 1,
  KILOMETER: 1000,
  MILE: 1609.344, // definición internacional de la milla
  SECOND: 1,
};

export const CANONICAL_UNIT: Record<RecordType, RecordUnit> = {
  WEIGHT: 'KILOGRAM',
  REPS: 'REPETITION',
  DISTANCE: 'METER',
  DURATION: 'SECOND',
  TIME: 'SECOND',
};

export function isUnitAllowed(recordType: RecordType, unit: RecordUnit): boolean {
  return UNITS_BY_RECORD_TYPE[recordType].includes(unit);
}

/**
 * Redondea a `decimals` decimales, con los empates alejándose de cero (6.25 → 6.3 y
 * −6.25 → −6.3) para que una mejora y un empeoramiento simétricos se muestren igual.
 * Compensa errores de coma flotante típicos (1.005 → 1.01).
 */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const rounded = Math.round((Math.abs(value) + Number.EPSILON) * factor) / factor;
  return value < 0 ? -rounded : rounded;
}

/**
 * Convierte un valor introducido a la unidad canónica de su tipo (kg, repeticiones, metros o
 * segundos). Se guarda con 3 decimales: suficiente para gramos y milímetros.
 */
export function toCanonical(value: number, unit: RecordUnit): number {
  return roundTo(value * TO_CANONICAL[unit], 3);
}

export function fromCanonical(canonicalValue: number, unit: RecordUnit): number {
  return canonicalValue / TO_CANONICAL[unit];
}

/** Unidad en la que conviene mostrar un valor canónico según las preferencias del atleta. */
export function displayUnitFor(
  recordType: RecordType,
  system: UnitSystem,
  canonicalValue = 0,
): RecordUnit {
  switch (recordType) {
    case 'WEIGHT':
      return system === 'IMPERIAL' ? 'POUND' : 'KILOGRAM';
    case 'DISTANCE':
      if (system === 'IMPERIAL') return 'MILE';
      return canonicalValue >= 1000 ? 'KILOMETER' : 'METER';
    default:
      return CANONICAL_UNIT[recordType];
  }
}

const UNIT_SYMBOLS: Record<RecordUnit, string> = {
  KILOGRAM: 'kg',
  POUND: 'lb',
  REPETITION: 'reps',
  METER: 'm',
  KILOMETER: 'km',
  MILE: 'mi',
  SECOND: 's',
};

export function unitSymbol(unit: RecordUnit): string {
  return UNIT_SYMBOLS[unit];
}

/** `3725` → `"1:02:05"`, `95` → `"1:35"`. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.round(totalSeconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * Interpreta `"ss"`, `"mm:ss"` o `"hh:mm:ss"` como segundos. Devuelve `null` si el texto no es
 * válido (minutos y segundos deben ser menores que 60 cuando no son el primer componente).
 */
export function parseDuration(text: string): number | null {
  const parts = text.trim().split(':');
  if (parts.length === 0 || parts.length > 3) return null;
  if (!parts.every((part) => /^\d+$/.test(part))) return null;
  const numbers = parts.map(Number);
  if (numbers.slice(1).some((n) => n >= 60)) return null;
  return numbers.reduce((total, n) => total * 60 + n, 0);
}

const DECIMALS: Partial<Record<RecordUnit, number>> = {
  KILOGRAM: 1,
  POUND: 1,
  KILOMETER: 2,
  MILE: 2,
};

/**
 * Presenta un valor canónico en la unidad indicada: `"102.5 kg"`, `"225 lb"`, `"1:35"`.
 * Es la única función de formato: web y mobile deben usarla para no divergir.
 */
export function formatRecordValue(
  recordType: RecordType,
  canonicalValue: number,
  unit: RecordUnit = CANONICAL_UNIT[recordType],
): string {
  if (recordType === 'TIME' || recordType === 'DURATION') return formatDuration(canonicalValue);
  const value = roundTo(fromCanonical(canonicalValue, unit), DECIMALS[unit] ?? 0);
  return `${value} ${unitSymbol(unit)}`;
}
