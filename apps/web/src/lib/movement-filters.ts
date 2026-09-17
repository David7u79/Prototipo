import { movementFiltersSchema } from '@garfit/validation';
import type { MovementFilters } from '@garfit/types';

type Query = Record<string, string | string[] | undefined>;

export function parseMovementFilters(query: Query): MovementFilters {
  const values = Object.fromEntries(
    Object.entries(query).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );

  // Validamos campo a campo para descartar parámetros corruptos o desconocidos
  const valid: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(movementFiltersSchema.shape)) {
    const raw = values[key];
    if (raw !== undefined && raw !== '') {
      const result = schema.safeParse(raw);
      if (result.success) {
        valid[key] = result.data;
      }
    }
  }

  const parsed = movementFiltersSchema.safeParse(valid);
  return parsed.success ? parsed.data : { page: 1, limit: 20 };
}

export function movementQuery(filters: MovementFilters, page?: number): string {
  const search = new URLSearchParams();
  const merged = { ...filters, ...(page !== undefined ? { page } : {}) };
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== '' && key !== 'limit') {
      search.set(key, String(value));
    }
  }
  return search.toString();
}
