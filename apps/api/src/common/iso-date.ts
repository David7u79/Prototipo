/**
 * Conversión entre fechas de calendario `YYYY-MM-DD` (contratos) y columnas `@db.Date`.
 * Se fija medianoche UTC para que la fecha no cambie según la zona del servidor.
 */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function fromIsoDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}
