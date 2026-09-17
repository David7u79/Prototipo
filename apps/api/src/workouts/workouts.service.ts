import {
  EMPTY_SCORE,
  comparePeriods,
  countInLastDays,
  formatScore,
  normalizeSet,
  recordCandidates,
  selectNewRecords,
  summarizeSets,
  totalVolumeKg,
  validatePrescription,
  validateScore,
  isNotInFuture,
  isValidIsoDate,
  UUID_PATTERN,
  type DistanceUnit,
  type LoadUnit,
  type RecordType,
} from '@garfit/domain';
import { Injectable } from '@nestjs/common';
import { ApiException } from '../common/api-exception.filter.js';
import { fromIsoDate, toIsoDate } from '../common/iso-date.js';
import { movementNotFound } from '../movements/movements.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type {
  CompleteWorkoutDto,
  CreateWorkoutDto,
  ResultsDto,
  UpdateWorkoutDto,
  WorkoutFiltersDto,
} from './dto/workout.dto.js';
import { toDerivedPersonalRecords, toWorkoutMovementRef } from './workouts.mapper.js';

const workoutNotFound = () =>
  new ApiException(404, 'WORKOUT_NOT_FOUND', 'No encontramos ese entrenamiento');
const invalidState = () =>
  new ApiException(409, 'WORKOUT_INVALID_STATE', 'La acción no está permitida en este estado');

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class WorkoutsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(userId: string, dto: CreateWorkoutDto) {
    if (dto.wodSlug) return this.createFromWod(userId, dto.wodSlug, dto.name);
    if (!dto.name || !dto.workoutType || !dto.exercises)
      throw new ApiException(400, 'VALIDATION_FAILED', 'Faltan datos del entrenamiento');
    if (validatePrescription(dto.workoutType, dto).length)
      throw new ApiException(400, 'VALIDATION_FAILED', 'Prescripción inválida');
    const movements = await this.movements(dto.exercises.map((item) => item.movementSlug));
    const ids = new Map(movements.map((item) => [item.slug, item.id]));
    const workout = await this.prisma.workout.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        notes: dto.notes,
        workoutType: dto.workoutType,
        durationSeconds: dto.durationSeconds,
        rounds: dto.rounds,
        intervalSeconds: dto.intervalSeconds,
        repScheme: dto.repScheme,
        exercises: {
          createMany: {
            data: dto.exercises.map((item, index) => ({
              ...exerciseData(item),
              movementId: ids.get(item.movementSlug)!,
              position: index + 1,
            })),
          },
        },
      },
    });
    return this.get(userId, workout.id);
  }
  async list(userId: string, filters: WorkoutFiltersDto) {
    const where = {
      userId,
      deletedAt: null,
      ...(filters.workoutType ? { workoutType: filters.workoutType } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.movement
        ? { exercises: { some: { movement: { slug: filters.movement } } } }
        : {}),
      ...(filters.from || filters.to
        ? {
            performedOn: {
              ...(filters.from ? { gte: fromIsoDate(filters.from) } : {}),
              ...(filters.to ? { lte: fromIsoDate(filters.to) } : {}),
            },
          }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.workout.count({ where }),
      this.prisma.workout.findMany({
        where,
        include: {
          wod: true,
          exercises: {
            include: {
              movement: true,
              results: { include: { personalRecords: { where: { deletedAt: null } } } },
            },
          },
          score: true,
        },
        orderBy: [{ performedOn: 'desc' }, { createdAt: 'desc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
    ]);
    return {
      items: rows.map((row) => this.listItem(row)),
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    };
  }
  async get(userId: string, id: string) {
    const row = await this.owned(userId, id);
    const records = await this.prisma.personalRecord.findMany({
      where: { userId, deletedAt: null },
      include: {
        movement: true,
        workoutResult: { include: { workoutExercise: { include: { workout: true } } } },
      },
    });
    return this.detail(row, records);
  }
  async update(userId: string, id: string, dto: UpdateWorkoutDto) {
    const workout = await this.owned(userId, id);
    if (workout.status !== 'DRAFT') throw invalidState();
    if (dto.exercises) {
      const movements = await this.movements(dto.exercises.map((item) => item.movementSlug));
      const ids = new Map(movements.map((item) => [item.slug, item.id]));
      await this.prisma.$transaction([
        this.prisma.workoutExercise.deleteMany({ where: { workoutId: id } }),
        this.prisma.workout.update({
          where: { id },
          data: {
            name: dto.name,
            description: dto.description,
            notes: dto.notes,
            exercises: {
              createMany: {
                data: dto.exercises.map((item, index) => ({
                  ...exerciseData(item),
                  movementId: ids.get(item.movementSlug)!,
                  position: index + 1,
                })),
              },
            },
          },
        }),
      ]);
    } else
      await this.prisma.workout.update({
        where: { id },
        data: { name: dto.name, description: dto.description, notes: dto.notes },
      });
    return this.get(userId, id);
  }
  async remove(userId: string, id: string) {
    await this.owned(userId, id);
    await this.prisma.$transaction([
      this.prisma.workout.updateMany({
        where: { id, userId, deletedAt: null },
        data: { deletedAt: new Date() },
      }),
      this.prisma.personalRecord.updateMany({
        where: { userId, deletedAt: null, workoutResult: { workoutExercise: { workoutId: id } } },
        data: { deletedAt: new Date() },
      }),
    ]);
  }
  async start(userId: string, id: string) {
    const workout = await this.owned(userId, id);
    if (workout.status !== 'DRAFT') throw invalidState();
    await this.prisma.workout.update({
      where: { id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });
    return this.get(userId, id);
  }
  async saveResults(userId: string, id: string, dto: ResultsDto) {
    await this.prisma.$transaction(async (tx) => {
      const workout = await this.owned(userId, id, tx);
      if (workout.status === 'COMPLETED') {
        throw invalidState();
      }
      await this.replaceResults(tx, workout, dto);
    });
    return this.get(userId, id);
  }
  async complete(userId: string, id: string, dto: CompleteWorkoutDto) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
      const workout = await this.owned(userId, id, tx);
      if (workout.status === 'COMPLETED') {
        return;
      }
      if (dto.results) {
        await this.replaceResults(tx, workout, dto.results);
      }
      const current = await this.owned(userId, id, tx);
      const incompleteDetails = workoutIncompleteDetails(current);
      if (incompleteDetails.length) {
        throw new ApiException(
          422,
          'WORKOUT_INCOMPLETE',
          'Faltan resultados para completar el entrenamiento',
          incompleteDetails,
        );
      }
      const performedOn = validPerformedOn(dto.performedOn);
      const transition = await tx.workout.updateMany({
        where: { id, userId, deletedAt: null, status: { not: 'COMPLETED' } },
        data: { status: 'COMPLETED', completedAt: new Date(), performedOn },
      });
      if (transition.count > 0) {
        await this.createRecords(tx, userId, id);
      }
    });
    return this.get(userId, id);
  }
  async stats(userId: string) {
    const rows = await this.prisma.workout.findMany({
      where: { userId, deletedAt: null, status: 'COMPLETED' },
      include: {
        wod: true,
        exercises: {
          include: {
            movement: true,
            results: { include: { personalRecords: { where: { deletedAt: null } } } },
          },
        },
        score: true,
      },
    });
    const dates = rows.flatMap((row) => (row.performedOn ? [toIsoDate(row.performedOn)] : []));
    const now = new Date();
    const from = new Date(now.getTime() - 29 * 86400000).toISOString().slice(0, 10);
    const records = await this.prisma.personalRecord.findMany({
      where: {
        userId,
        source: 'WORKOUT',
        deletedAt: null,
        performedAt: { gte: fromIsoDate(from) },
      },
      include: { movement: true },
    });
    const periodRecords = await this.prisma.personalRecord.findMany({
      where: { userId, deletedAt: null },
      select: { performedAt: true },
    });
    const volume = volumeByMovement(rows, from);
    const periodComparison = comparePeriods(
      rows.flatMap((row) =>
        row.performedOn
          ? [
              {
                performedOn: toIsoDate(row.performedOn),
                sets: row.exercises.flatMap((exercise) =>
                  exercise.results.map((result) => ({
                    reps: result.reps,
                    loadKg: numberOrNull(result.loadKg),
                    distanceMeters: numberOrNull(result.distanceMeters),
                    durationSeconds: result.durationSeconds,
                  })),
                ),
              },
            ]
          : [],
      ),
      periodRecords.map((record) => toIsoDate(record.performedAt)),
      30,
      now,
    );
    return {
      totalCompleted: rows.length,
      last7Days: countInLastDays(dates, 7, now),
      last30Days: countInLastDays(dates, 30, now),
      lastWorkout: rows.sort(
        (a, b) => (b.performedOn?.getTime() ?? 0) - (a.performedOn?.getTime() ?? 0),
      )[0]
        ? this.listItem(rows[0]!)
        : null,
      personalRecordsFromWorkoutsLast30Days: records.length,
      recentPersonalRecords: records.slice(0, 5),
      volumeByMovementLast30Days: [...volume.values()]
        .filter((item) => item.volumeKg > 0)
        .sort((a, b) => b.volumeKg - a.volumeKg)
        .map((item) => ({
          movement: toWorkoutMovementRef(item.movement),
          volumeKg: item.volumeKg,
        })),
      periodComparison,
    };
  }
  private async createFromWod(userId: string, slug: string, name?: string) {
    const wod = await this.prisma.wod.findFirst({
      where: { slug, OR: [{ ownerId: null }, { ownerId: userId }] },
      include: { exercises: true },
    });
    if (!wod) throw new ApiException(404, 'WOD_NOT_FOUND', 'No encontramos ese WOD');
    const workout = await this.prisma.workout.create({
      data: {
        userId,
        wodId: wod.id,
        name: name ?? wod.name,
        workoutType: wod.workoutType,
        durationSeconds: wod.durationSeconds,
        rounds: wod.rounds,
        intervalSeconds: wod.intervalSeconds,
        repScheme: wod.repScheme,
        exercises: {
          create: wod.exercises.map((item) => ({
            movementId: item.movementId,
            position: item.position,
            targetReps: item.reps,
            targetLoadValue: item.loadValue,
            targetLoadUnit: item.loadUnit,
            targetDistanceValue: item.distanceValue,
            targetDistanceUnit: item.distanceUnit,
            targetDurationSeconds: item.durationSeconds,
            notes: item.notes,
          })),
        },
      },
    });
    return this.get(userId, workout.id);
  }
  private async replaceResults(
    tx: Prisma.TransactionClient,
    workout: Awaited<ReturnType<WorkoutsService['owned']>>,
    dto: ResultsDto,
  ) {
    const ids = new Set(workout.exercises.map((item) => item.id));
    if (dto.exercises.some((item) => !ids.has(item.exerciseId)))
      throw new ApiException(
        400,
        'VALIDATION_FAILED',
        'El ejercicio no pertenece al entrenamiento',
      );
    if (dto.exercises.length !== new Set(dto.exercises.map((item) => item.exerciseId)).size) {
      throw new ApiException(400, 'VALIDATION_FAILED', 'El ejercicio se envió más de una vez');
    }
    const sets = dto.exercises.flatMap((item) => item.sets);
    if (sets.length > 300) {
      throw new ApiException(400, 'VALIDATION_FAILED', 'Se excedió el límite de series');
    }
    const resultKeys = dto.exercises.flatMap((exercise) =>
      exercise.sets.map((set) => `${exercise.exerciseId}:${set.setNumber}`),
    );
    if (resultKeys.length !== new Set(resultKeys).size) {
      throw new ApiException(400, 'VALIDATION_FAILED', 'El número de serie debe ser único');
    }
    const score = dto.score ?? EMPTY_SCORE;
    const errors = validateScore(workout.workoutType, score);
    if (dto.score && errors.length) throw new ApiException(400, 'VALIDATION_FAILED', errors[0]!);
    const data = dto.exercises.flatMap((exercise) =>
      exercise.sets.map((set) => {
        const normalized = normalizeSet(set);
        if (normalized.errors.length)
          throw new ApiException(400, 'VALIDATION_FAILED', normalized.errors[0]!);
        return {
          workoutExerciseId: exercise.exerciseId,
          setNumber: set.setNumber,
          reps: set.reps,
          loadValue: set.loadValue,
          loadUnit: set.loadUnit,
          loadKg: normalized.value.loadKg,
          distanceValue: set.distanceValue,
          distanceUnit: set.distanceUnit,
          distanceMeters: normalized.value.distanceMeters,
          durationSeconds: set.durationSeconds,
        };
      }),
    );
    await tx.workoutResult.deleteMany({
      where: { workoutExercise: { workoutId: workout.id } },
    });
    await tx.workoutResult.createMany({ data });
    if (dto.score)
      await tx.workoutScore.upsert({
        where: { workoutId: workout.id },
        create: { workoutId: workout.id, ...dto.score },
        update: dto.score,
      });
    else await tx.workoutScore.deleteMany({ where: { workoutId: workout.id } });
  }
  private async createRecords(tx: Prisma.TransactionClient, userId: string, id: string) {
    const workout = await this.owned(userId, id, tx);
    const candidates = recordCandidates(
      workout.workoutType,
      workout.exercises.map((exercise) => ({
        movementId: exercise.movementId,
        recordTypes: exercise.movement.recordTypes,
        results: exercise.results.map((result) => ({
          resultId: result.id,
          setNumber: result.setNumber,
          reps: result.reps,
          loadValue: numberOrNull(result.loadValue),
          loadUnit: toLoadUnit(result.loadUnit),
          distanceValue: numberOrNull(result.distanceValue),
          distanceUnit: toDistanceUnit(result.distanceUnit),
          durationSeconds: result.durationSeconds,
        })),
      })),
    );
    const history = await tx.personalRecord.findMany({
      where: {
        userId,
        deletedAt: null,
        movementId: { in: candidates.map((item) => item.movementId) },
      },
    });
    const newRecords = selectNewRecords(candidates, groupHistory(history));
    if (newRecords.length > 0) {
      await tx.personalRecord.createMany({
        data: newRecords.map(({ candidate }) => ({
          userId,
          movementId: candidate.movementId,
          recordType: candidate.recordType,
          value: candidate.value,
          unit: candidate.unit,
          normalizedValue: candidate.normalizedValue,
          repetitions: candidate.repetitions,
          distanceValue: candidate.distanceValue,
          distanceUnit: candidate.distanceUnit,
          distanceMeters: candidate.distanceMeters,
          performedAt: workout.performedOn!,
          source: 'WORKOUT',
          workoutResultId: candidate.resultId,
        })),
      });
    }
  }
  private async owned(userId: string, id: string, client: DbClient = this.prisma) {
    if (!UUID_PATTERN.test(id)) {
      throw new ApiException(400, 'VALIDATION_FAILED', 'El identificador no es válido');
    }
    const row = await client.workout.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        wod: true,
        score: true,
        exercises: {
          include: {
            movement: true,
            results: {
              orderBy: { setNumber: 'asc' },
              include: { personalRecords: { where: { deletedAt: null } } },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!row) throw workoutNotFound();
    return row;
  }
  private async movements(slugs: string[]) {
    const movements = await this.prisma.movement.findMany({
      where: { slug: { in: slugs }, isActive: true },
    });
    if (movements.length !== new Set(slugs).size) throw movementNotFound();
    return movements;
  }
  private listItem(row: Awaited<ReturnType<WorkoutsService['owned']>>) {
    const sets = row.exercises.flatMap((item) =>
      item.results.map((result) => ({
        reps: result.reps,
        loadKg: numberOrNull(result.loadKg),
        distanceMeters: numberOrNull(result.distanceMeters),
        durationSeconds: result.durationSeconds,
      })),
    );
    return {
      id: row.id,
      name: row.name,
      workoutType: row.workoutType,
      status: row.status,
      performedOn: row.performedOn ? toIsoDate(row.performedOn) : null,
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      wod: row.wod ? { slug: row.wod.slug, name: row.wod.name } : null,
      movements: row.exercises.map((item) => item.movement.name),
      headline:
        formatScore(row.workoutType, row.score ?? EMPTY_SCORE) ??
        summarizeSets(row.workoutType, sets),
      personalRecordCount: row.exercises.reduce(
        (count, exercise) =>
          count +
          exercise.results.reduce(
            (sum, result) =>
              sum + ('personalRecords' in result ? result.personalRecords.length : 0),
            0,
          ),
        0,
      ),
    };
  }
  private detail(
    row: Awaited<ReturnType<WorkoutsService['owned']>>,
    records: import('../records/records.mapper.js').RecordRow[],
  ) {
    const sets = row.exercises.flatMap((item) =>
      item.results.map((result) => ({
        reps: result.reps,
        loadKg: numberOrNull(result.loadKg),
        distanceMeters: numberOrNull(result.distanceMeters),
        durationSeconds: result.durationSeconds,
      })),
    );
    return {
      ...this.listItem(row),
      description: row.description,
      notes: row.notes,
      startedAt: row.startedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      durationSeconds: row.durationSeconds,
      rounds: row.rounds,
      intervalSeconds: row.intervalSeconds,
      repScheme: row.repScheme,
      score: row.score,
      volumeKg: totalVolumeKg(sets),
      exercises: row.exercises.map((item) => ({
        id: item.id,
        position: item.position,
        movement: {
          ...toWorkoutMovementRef(item.movement),
          recordTypes: item.movement.recordTypes,
        },
        targetSets: item.targetSets,
        targetReps: item.targetReps,
        targetLoadValue: numberOrNull(item.targetLoadValue),
        targetLoadUnit: item.targetLoadUnit,
        targetDistanceValue: numberOrNull(item.targetDistanceValue),
        targetDistanceUnit: item.targetDistanceUnit,
        targetDurationSeconds: item.targetDurationSeconds,
        restSeconds: item.restSeconds,
        notes: item.notes,
        results: item.results.map((result) => ({
          id: result.id,
          setNumber: result.setNumber,
          reps: result.reps,
          loadValue: numberOrNull(result.loadValue),
          loadUnit: result.loadUnit,
          loadKg: numberOrNull(result.loadKg),
          distanceValue: numberOrNull(result.distanceValue),
          distanceUnit: result.distanceUnit,
          distanceMeters: numberOrNull(result.distanceMeters),
          durationSeconds: result.durationSeconds,
        })),
        volumeKg: totalVolumeKg(
          item.results.map((result) => ({
            reps: result.reps,
            loadKg: numberOrNull(result.loadKg),
          })),
        ),
      })),
      personalRecords: toDerivedPersonalRecords(
        records,
        new Set(row.exercises.flatMap((exercise) => exercise.results.map((result) => result.id))),
      ),
    };
  }
}

function exerciseData(item: {
  targetSets: number | null;
  targetReps: number | null;
  targetLoadValue: number | null;
  targetLoadUnit: LoadUnit | null;
  targetDistanceValue: number | null;
  targetDistanceUnit: DistanceUnit | null;
  targetDurationSeconds: number | null;
  restSeconds: number | null;
  notes: string | null;
}) {
  return {
    targetSets: item.targetSets,
    targetReps: item.targetReps,
    targetLoadValue: item.targetLoadValue,
    targetLoadUnit: item.targetLoadUnit,
    targetDistanceValue: item.targetDistanceValue,
    targetDistanceUnit: item.targetDistanceUnit,
    targetDurationSeconds: item.targetDurationSeconds,
    restSeconds: item.restSeconds,
    notes: item.notes,
  };
}
function numberOrNull(value: { toString(): string } | null): number | null {
  return value === null ? null : Number(value);
}
function groupHistory(
  rows: {
    movementId: string;
    recordType: RecordType;
    repetitions: number | null;
    distanceMeters: { toString(): string } | null;
    normalizedValue: { toString(): string };
  }[],
) {
  const groups = new Map<
    string,
    {
      movementId: string;
      entries: {
        recordType: RecordType;
        repetitions: number | null;
        distanceMeters: number | null;
        normalizedValue: number;
      }[];
    }
  >();
  for (const row of rows) {
    const group = groups.get(row.movementId) ?? { movementId: row.movementId, entries: [] };
    group.entries.push({
      recordType: row.recordType,
      repetitions: row.repetitions,
      distanceMeters: numberOrNull(row.distanceMeters),
      normalizedValue: Number(row.normalizedValue),
    });
    groups.set(row.movementId, group);
  }
  return [...groups.values()];
}
function toLoadUnit(value: string | null): LoadUnit | null {
  return value === 'KILOGRAM' || value === 'POUND' ? value : null;
}
function toDistanceUnit(value: string | null): DistanceUnit | null {
  return value === 'METER' || value === 'KILOMETER' || value === 'MILE' ? value : null;
}
function validPerformedOn(performedOn?: string): Date {
  const value = performedOn ?? new Date().toISOString().slice(0, 10);
  if (!isValidIsoDate(value) || !isNotInFuture(value)) {
    throw new ApiException(400, 'VALIDATION_FAILED', 'Fecha de realización inválida');
  }
  return fromIsoDate(value);
}
function workoutIncompleteDetails(
  workout: Awaited<ReturnType<WorkoutsService['owned']>>,
): string[] {
  const scoreErrors = validateScore(workout.workoutType, workout.score ?? EMPTY_SCORE);
  if (['FOR_TIME', 'AMRAP', 'EMOM'].includes(workout.workoutType) && scoreErrors.length) {
    return scoreErrors;
  }
  const results = workout.exercises.flatMap((exercise) => exercise.results);
  if (workout.workoutType === 'STRENGTH' && !results.some((result) => result.reps !== null)) {
    return ['Registra al menos una serie con repeticiones'];
  }
  if (
    workout.workoutType === 'CARDIO' &&
    !results.some((result) => result.distanceMeters !== null || result.durationSeconds !== null)
  ) {
    return ['Registra al menos una serie con distancia o duración'];
  }
  return [];
}
function volumeByMovement(workouts: Awaited<ReturnType<WorkoutsService['owned']>>[], from: string) {
  const volume = new Map<
    string,
    { movement: (typeof workouts)[number]['exercises'][number]['movement']; volumeKg: number }
  >();
  for (const workout of workouts) {
    if (!workout.performedOn || toIsoDate(workout.performedOn) < from) {
      continue;
    }
    for (const exercise of workout.exercises) {
      const entry = volume.get(exercise.movementId) ?? {
        movement: exercise.movement,
        volumeKg: 0,
      };
      entry.volumeKg += totalVolumeKg(
        exercise.results.map((result) => ({
          reps: result.reps,
          loadKg: numberOrNull(result.loadKg),
        })),
      );
      volume.set(exercise.movementId, entry);
    }
  }
  return volume;
}
