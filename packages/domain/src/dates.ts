import { ISO_DATE_PATTERN } from './rules.js';

/** `true` si `text` es una fecha de calendario real `YYYY-MM-DD` (rechaza 2026-02-30). */
export function isValidIsoDate(text: string): boolean {
  if (!ISO_DATE_PATTERN.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

/** Fecha de hoy `YYYY-MM-DD` en UTC. */
export function todayIsoDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * `true` si la fecha no está en el futuro. Se admite un día de margen para que un atleta en
 * UTC−12 pueda registrar "hoy" aunque en UTC ya sea mañana.
 */
export function isNotInFuture(isoDate: string, now: Date = new Date()): boolean {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return isoDate <= todayIsoDate(tomorrow);
}

/** Años completos cumplidos entre `birthDate` y `now`. */
export function ageInYears(birthDate: string, now: Date = new Date()): number {
  const [y, m, d] = birthDate.split('-').map(Number) as [number, number, number];
  const today = todayIsoDate(now).split('-').map(Number) as [number, number, number];
  let age = today[0] - y;
  if (today[1] < m || (today[1] === m && today[2] < d)) age -= 1;
  return age;
}
