import type { Prisma } from '../generated/prisma/client.js';
import type { MovementDetailResponse, MovementSummaryResponse } from './dto/movement.dto.js';

/** Columnas de MovementSummary. Los listados nunca cargan instrucciones ni metadatos internos. */
export const MOVEMENT_SUMMARY_SELECT = {
  id: true,
  slug: true,
  name: true,
  category: true,
  equipment: true,
  difficulty: true,
  primaryMuscles: true,
  secondaryMuscles: true,
  recordTypes: true,
} satisfies Prisma.MovementSelect;

export const MOVEMENT_DETAIL_SELECT = {
  ...MOVEMENT_SUMMARY_SELECT,
  description: true,
  instructions: true,
  source: true,
} satisfies Prisma.MovementSelect;

type SummaryRow = Prisma.MovementGetPayload<{ select: typeof MOVEMENT_SUMMARY_SELECT }>;
type DetailRow = Prisma.MovementGetPayload<{ select: typeof MOVEMENT_DETAIL_SELECT }>;

/** Copia explícita de campos: aunque llegue una fila completa, no se filtran columnas internas. */
export function toMovementSummary(row: SummaryRow): MovementSummaryResponse {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    equipment: row.equipment,
    difficulty: row.difficulty,
    primaryMuscles: row.primaryMuscles,
    secondaryMuscles: row.secondaryMuscles,
    recordTypes: row.recordTypes,
  };
}

export function toMovementDetail(row: DetailRow): MovementDetailResponse {
  return {
    ...toMovementSummary(row),
    description: row.description,
    instructions: row.instructions,
    source: row.source,
  };
}
