import {
  EMPTY_SCORE,
  type AthleteProgressSnapshot,
  buildProgressSnapshot,
  type SnapshotMovementRecords,
  type SnapshotWorkoutInput,
} from '@garfit/domain';
import { Injectable } from '@nestjs/common';
import { toIsoDate } from '../common/iso-date.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toRecordEntry } from '../records/records.mapper.js';

/**
 * Construye la instantánea estructurada del progreso de un atleta (sin IA). Una fase posterior
 * la usará como contexto para Gemini; los cálculos ya vienen hechos de forma determinista.
 */
@Injectable()
export class ProgressSnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  async build(userId: string, now: Date = new Date()): Promise<AthleteProgressSnapshot> {
    const [profile, rows, workouts] = await Promise.all([
      this.prisma.athleteProfile.findUnique({ where: { userId } }),
      this.prisma.personalRecord.findMany({
        where: { userId, deletedAt: null },
        include: { movement: { select: { slug: true, name: true } } },
      }),
      this.prisma.workout.findMany({
        where: { userId, deletedAt: null, status: 'COMPLETED', performedOn: { not: null } },
        include: {
          score: true,
          exercises: {
            include: {
              movement: { select: { slug: true, name: true } },
              results: { orderBy: { setNumber: 'asc' } },
            },
            orderBy: { position: 'asc' },
          },
        },
      }),
    ]);

    const byMovement = new Map<string, SnapshotMovementRecords>();
    for (const row of rows) {
      const movement = byMovement.get(row.movementId) ?? {
        movementSlug: row.movement.slug,
        movementName: row.movement.name,
        entries: [],
      };
      movement.entries.push({ ...toRecordEntry(row), source: row.source });
      byMovement.set(row.movementId, movement);
    }

    const profileInput = profile
      ? {
          experienceLevel: profile.experienceLevel,
          primaryGoal: profile.primaryGoal,
          preferredUnits: profile.preferredUnits,
          birthDate: profile.birthDate ? toIsoDate(profile.birthDate) : null,
          trainingSince: profile.trainingSince ? toIsoDate(profile.trainingSince) : null,
        }
      : null;
    const recordsByWorkoutResult = await this.prisma.personalRecord.groupBy({
      by: ['workoutResultId'],
      where: {
        userId,
        source: 'WORKOUT',
        deletedAt: null,
        workoutResultId: { not: null },
      },
      _count: { _all: true },
    });
    const personalRecords = new Map(
      recordsByWorkoutResult.map((row) => [row.workoutResultId!, row._count._all]),
    );
    return buildProgressSnapshot(
      profileInput,
      [...byMovement.values()],
      now,
      workouts.map((workout): SnapshotWorkoutInput => ({
        performedOn: toIsoDate(workout.performedOn!),
        workoutType: workout.workoutType,
        name: workout.name,
        score: workout.score ?? EMPTY_SCORE,
        personalRecords: workout.exercises
          .flatMap((exercise) => exercise.results)
          .reduce((count, result) => count + (personalRecords.get(result.id) ?? 0), 0),
        exercises: workout.exercises.map((exercise) => ({
          movementSlug: exercise.movement.slug,
          movementName: exercise.movement.name,
          sets: exercise.results.map((result) => ({
            reps: result.reps,
            loadKg: result.loadKg === null ? null : Number(result.loadKg),
            distanceMeters: result.distanceMeters === null ? null : Number(result.distanceMeters),
            durationSeconds: result.durationSeconds,
          })),
        })),
      })),
    );
  }
}
