import { SLUG_MAX_LENGTH, SLUG_PATTERN } from '@garfit/domain';
import { Injectable } from '@nestjs/common';
import { ApiException } from '../common/api-exception.filter.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  MovementDetailResponse,
  MovementFiltersDto,
  PaginatedMovementsResponse,
} from './dto/movement.dto.js';
import {
  MOVEMENT_DETAIL_SELECT,
  MOVEMENT_SUMMARY_SELECT,
  toMovementDetail,
  toMovementSummary,
} from './movement.mapper.js';

/** Valida el formato de un slug recibido por URL (400 si no cumple el patrón). */
export function assertValidSlug(slug: string): void {
  if (slug.length > SLUG_MAX_LENGTH || !SLUG_PATTERN.test(slug)) {
    throw new ApiException(
      400,
      'VALIDATION_FAILED',
      'El identificador del movimiento no es válido',
    );
  }
}

export const movementNotFound = () =>
  new ApiException(404, 'MOVEMENT_NOT_FOUND', 'No encontramos ese movimiento');

@Injectable()
export class MovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: MovementFiltersDto): Promise<PaginatedMovementsResponse> {
    const where = buildWhere(filters);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.movement.count({ where }),
      this.prisma.movement.findMany({
        where,
        select: MOVEMENT_SUMMARY_SELECT,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
    ]);
    return {
      items: rows.map(toMovementSummary),
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    };
  }

  /** Detalle de un movimiento activo. Los inactivos sólo siguen visibles en el historial. */
  async getBySlug(slug: string): Promise<MovementDetailResponse> {
    assertValidSlug(slug);
    const row = await this.prisma.movement.findFirst({
      where: { slug, isActive: true },
      select: MOVEMENT_DETAIL_SELECT,
    });
    if (!row) throw movementNotFound();
    return toMovementDetail(row);
  }
}

function buildWhere(filters: MovementFiltersDto): Prisma.MovementWhereInput {
  const where: Prisma.MovementWhereInput = { isActive: true };
  if (filters.search) where.name = { contains: filters.search, mode: 'insensitive' };
  if (filters.category) where.category = filters.category;
  if (filters.equipment) where.equipment = filters.equipment;
  if (filters.difficulty) where.difficulty = filters.difficulty;
  if (filters.recordType) where.recordTypes = { has: filters.recordType };
  if (filters.muscleGroup) {
    where.OR = [
      { primaryMuscles: { has: filters.muscleGroup } },
      { secondaryMuscles: { has: filters.muscleGroup } },
    ];
  }
  return where;
}
