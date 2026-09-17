import { compareWodPerformance, type WorkoutType, validatePrescription } from '@garfit/domain';
import { Injectable } from '@nestjs/common';
import { ApiException } from '../common/api-exception.filter.js';
import { movementNotFound } from '../movements/movements.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateWodDto, WodFiltersDto } from './dto/wod.dto.js';

const wodNotFound = () => new ApiException(404, 'WOD_NOT_FOUND', 'No encontramos ese WOD');

@Injectable()
export class WodsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, filters: WodFiltersDto) {
    const where = {
      AND: [
        { OR: [{ ownerId: null }, { ownerId: userId }] },
        ...(filters.search
          ? [{ name: { contains: filters.search, mode: 'insensitive' as const } }]
          : []),
        ...(filters.workoutType ? [{ workoutType: filters.workoutType }] : []),
        ...(filters.benchmark === undefined ? [] : [{ isBenchmark: filters.benchmark === 'true' }]),
      ],
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.wod.count({ where }),
      this.prisma.wod.findMany({
        where,
        include: { exercises: { include: { movement: true } } },
        orderBy: [{ isBenchmark: 'desc' }, { name: 'asc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
    ]);
    return {
      items: rows.map((row) => this.summary(row, userId)),
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    };
  }

  async get(userId: string, slug: string) {
    const row = await this.prisma.wod.findFirst({
      where: { slug, OR: [{ ownerId: null }, { ownerId: userId }] },
      include: { exercises: { include: { movement: true }, orderBy: { position: 'asc' } } },
    });
    if (!row) throw wodNotFound();
    return {
      ...this.summary(row, userId),
      description: row.description,
      source: row.source,
      exercises: row.exercises.map((exercise) => ({
        position: exercise.position,
        movement: {
          slug: exercise.movement.slug,
          name: exercise.movement.name,
          category: exercise.movement.category,
          equipment: exercise.movement.equipment,
          recordTypes: exercise.movement.recordTypes,
        },
        reps: exercise.reps,
        loadValue: numberOrNull(exercise.loadValue),
        loadUnit: exercise.loadUnit,
        distanceValue: numberOrNull(exercise.distanceValue),
        distanceUnit: exercise.distanceUnit,
        durationSeconds: exercise.durationSeconds,
        notes: exercise.notes,
      })),
    };
  }

  async performance(userId: string, slug: string) {
    const wod = await this.prisma.wod.findFirst({
      where: { slug, OR: [{ ownerId: null }, { ownerId: userId }] },
      include: { exercises: { select: { reps: true } } },
    });
    if (!wod) throw wodNotFound();
    const attempts = await this.prisma.workout.findMany({
      where: {
        userId,
        wodId: wod.id,
        deletedAt: null,
        status: 'COMPLETED',
        performedOn: { not: null },
      },
      include: {
        score: true,
        exercises: { include: { results: { orderBy: { setNumber: 'asc' } } } },
      },
    });
    const repsPerRound = wod.exercises.every((exercise) => exercise.reps !== null)
      ? wod.exercises.reduce((total, exercise) => total + exercise.reps!, 0)
      : null;
    return {
      wod: {
        slug: wod.slug,
        name: wod.name,
        workoutType: wod.workoutType,
        isBenchmark: wod.isBenchmark,
      },
      performance: compareWodPerformance(
        wod.workoutType,
        attempts.map((attempt) => ({
          workoutId: attempt.id,
          performedOn: attempt.performedOn!.toISOString().slice(0, 10),
          score: attempt.score ?? {
            timeSeconds: null,
            repsAtTimeCap: null,
            rounds: null,
            extraReps: null,
            completed: null,
          },
          sets: attempt.exercises.flatMap((exercise) =>
            exercise.results.map((result) => ({
              reps: result.reps,
              loadKg: numberOrNull(result.loadKg),
              distanceMeters: numberOrNull(result.distanceMeters),
              durationSeconds: result.durationSeconds,
            })),
          ),
        })),
        { repsPerRound },
      ),
    };
  }

  async create(userId: string, dto: CreateWodDto) {
    const errors = validatePrescription(dto.workoutType, dto);
    if (errors.length) throw new ApiException(400, 'VALIDATION_FAILED', errors[0]!);
    for (const exercise of dto.exercises) {
      if (
        (exercise.loadValue === null) !== (exercise.loadUnit === null) ||
        (exercise.distanceValue === null) !== (exercise.distanceUnit === null)
      )
        throw new ApiException(400, 'VALIDATION_FAILED', 'El valor y su unidad van juntos');
    }
    const movements = await this.prisma.movement.findMany({
      where: { slug: { in: dto.exercises.map((item) => item.movementSlug) }, isActive: true },
    });
    if (movements.length !== new Set(dto.exercises.map((item) => item.movementSlug)).size)
      throw movementNotFound();
    const bySlug = new Map(movements.map((movement) => [movement.slug, movement.id]));
    const slug = `${slugify(dto.name)}-${Math.random().toString(36).slice(2, 8)}`;
    const wod = await this.prisma.wod.create({
      data: {
        slug,
        ownerId: userId,
        name: dto.name.trim(),
        description: dto.description,
        workoutType: dto.workoutType,
        durationSeconds: dto.durationSeconds,
        rounds: dto.rounds,
        intervalSeconds: dto.intervalSeconds,
        repScheme: dto.repScheme,
        exercises: {
          create: dto.exercises.map((exercise, index) => ({
            movementId: bySlug.get(exercise.movementSlug)!,
            position: index + 1,
            reps: exercise.reps,
            loadValue: exercise.loadValue,
            loadUnit: exercise.loadUnit,
            distanceValue: exercise.distanceValue,
            distanceUnit: exercise.distanceUnit,
            durationSeconds: exercise.durationSeconds,
            notes: exercise.notes,
          })),
        },
      },
    });
    return this.get(userId, wod.slug);
  }

  private summary(
    row: {
      id: string;
      slug: string;
      name: string;
      workoutType: WorkoutType;
      durationSeconds: number | null;
      rounds: number | null;
      intervalSeconds: number | null;
      repScheme: number[];
      isBenchmark: boolean;
      ownerId: string | null;
      exercises: unknown[];
    },
    userId: string,
  ) {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      workoutType: row.workoutType,
      durationSeconds: row.durationSeconds,
      rounds: row.rounds,
      intervalSeconds: row.intervalSeconds,
      repScheme: row.repScheme,
      isBenchmark: row.isBenchmark,
      isPersonal: row.ownerId === userId,
      exerciseCount: row.exercises.length,
    };
  }
}

function numberOrNull(value: { toString(): string } | null): number | null {
  return value === null ? null : Number(value);
}
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'wod'
  );
}
