/**
 * Crea o reinicia un atleta de demostración con perfil y marcas plausibles.
 * Nunca en producción; la contraseña sale de DEMO_USER_PASSWORD. Uso: `pnpm db:seed:demo`.
 */
import 'dotenv/config';
import { hash } from '@node-rs/argon2';
import { NestFactory } from '@nestjs/core';
import { PrismaPg } from '@prisma/adapter-pg';
import { PASSWORD_MIN_LENGTH, toCanonical } from '@garfit/domain';
import { AppModule } from '../app.module.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { WorkoutsService } from '../workouts/workouts.service.js';

if (process.env.NODE_ENV === 'production') {
  throw new Error('La semilla demo no se puede ejecutar en producción');
}
const password = process.env.DEMO_USER_PASSWORD;
if (!password || password.length < PASSWORD_MIN_LENGTH) {
  throw new Error(`DEMO_USER_PASSWORD debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`);
}
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL es obligatoria');
const email = (process.env.DEMO_USER_EMAIL ?? 'demo@garfit.example').trim().toLowerCase();
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const records = [
  ['barbell-bench-press', 'WEIGHT', 75, 'KILOGRAM', 1, '2025-04-10'],
  ['barbell-bench-press', 'WEIGHT', 80, 'KILOGRAM', 1, '2025-07-10'],
  ['push-up', 'REPS', 30, 'REPETITION', null, '2025-05-10'],
  ['push-up', 'REPS', 38, 'REPETITION', null, '2025-08-10'],
  ['front-plank-with-twist', 'DURATION', 60, 'SECOND', null, '2025-08-15'],
] as const;

try {
  const movements = await prisma.movement.findMany({
    where: { slug: { in: records.map((item) => item[0]) } },
  });
  if (movements.length !== new Set(records.map((item) => item[0])).size) {
    throw new Error('Falta el catálogo: ejecuta pnpm db:seed antes de la semilla demo');
  }
  const user = await prisma.user.upsert({
    where: { email },
    update: { name: 'Atleta demo' },
    create: { email, name: 'Atleta demo' },
  });
  await prisma.authAccount.upsert({
    where: { userId_provider: { userId: user.id, provider: 'LOCAL' } },
    update: { providerAccountId: email, passwordHash: await hash(password, { algorithm: 2 }) },
    create: {
      userId: user.id,
      provider: 'LOCAL',
      providerAccountId: email,
      passwordHash: await hash(password, { algorithm: 2 }),
    },
  });
  await prisma.athleteProfile.upsert({
    where: { userId: user.id },
    update: {
      displayName: 'Atleta demo',
      experienceLevel: 'INTERMEDIATE',
      primaryGoal: 'STRENGTH',
      preferredUnits: 'METRIC',
    },
    create: {
      userId: user.id,
      displayName: 'Atleta demo',
      experienceLevel: 'INTERMEDIATE',
      primaryGoal: 'STRENGTH',
      preferredUnits: 'METRIC',
    },
  });
  await prisma.personalRecord.deleteMany({ where: { userId: user.id } });
  await prisma.workout.deleteMany({ where: { userId: user.id } });
  const movementIds = new Map(movements.map((movement) => [movement.slug, movement.id]));
  await prisma.personalRecord.createMany({
    data: records.map(([slug, recordType, value, unit, repetitions, performedAt]) => ({
      userId: user.id,
      movementId: movementIds.get(slug)!,
      recordType,
      value,
      unit,
      normalizedValue: toCanonical(value, unit),
      repetitions,
      performedAt: new Date(`${performedAt}T00:00:00.000Z`),
      source: 'MANUAL',
    })),
  });
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const workouts = app.get(WorkoutsService);
    await completeStrengthWorkout(workouts, user.id, 100, '2025-01-10');
    await completeStrengthWorkout(workouts, user.id, 100, '2025-01-17');
    await completeStrengthWorkout(workouts, user.id, 105, '2025-01-24');
    await completeStrengthWorkout(workouts, user.id, 110, '2025-01-31');
    await completeRunWorkout(workouts, user.id, '2025-08-20');
  } finally {
    await app.close();
  }
  console.log(`Usuario demo preparado: ${email}`);
} finally {
  await prisma.$disconnect();
}

async function completeStrengthWorkout(
  workouts: WorkoutsService,
  userId: string,
  loadValue: number,
  performedOn: string,
) {
  const workout = await workouts.create(
    userId,
    workoutDraft({
      name: `Sentadilla ${loadValue} kg`,
      workoutType: 'STRENGTH',
      exercises: [exercise('barbell-full-squat')],
    }),
  );
  await workouts.complete(userId, workout.id, {
    performedOn,
    results: {
      score: null,
      exercises: [
        {
          exerciseId: workout.exercises[0]!.id,
          sets: Array.from({ length: 5 }, (_, index) =>
            set({ setNumber: index + 1, reps: 5, loadValue, loadUnit: 'KILOGRAM' }),
          ),
        },
      ],
    },
  });
}

async function completeRunWorkout(workouts: WorkoutsService, userId: string, performedOn: string) {
  const workout = await workouts.create(
    userId,
    workoutDraft({
      name: 'Carrera 5 km',
      workoutType: 'CARDIO',
      exercises: [exercise('run')],
    }),
  );
  await workouts.complete(userId, workout.id, {
    performedOn,
    results: {
      score: null,
      exercises: [
        {
          exerciseId: workout.exercises[0]!.id,
          sets: [
            set({
              distanceValue: 5,
              distanceUnit: 'KILOMETER',
              durationSeconds: 1420,
            }),
          ],
        },
      ],
    },
  });
}
function exercise(movementSlug: string) {
  return {
    movementSlug,
    targetSets: null,
    targetReps: null,
    targetLoadValue: null,
    targetLoadUnit: null,
    targetDistanceValue: null,
    targetDistanceUnit: null,
    targetDurationSeconds: null,
    restSeconds: null,
    notes: null,
  };
}
function workoutDraft(values: {
  name: string;
  workoutType: 'STRENGTH' | 'CARDIO';
  exercises: ReturnType<typeof exercise>[];
}) {
  return {
    ...values,
    description: null,
    notes: null,
    durationSeconds: null,
    rounds: null,
    intervalSeconds: null,
    repScheme: [],
  };
}
function set(values: {
  setNumber?: number;
  reps?: number;
  loadValue?: number;
  loadUnit?: 'KILOGRAM';
  distanceValue?: number;
  distanceUnit?: 'KILOMETER';
  durationSeconds?: number;
}) {
  return {
    setNumber: values.setNumber ?? 1,
    reps: values.reps ?? null,
    loadValue: values.loadValue ?? null,
    loadUnit: values.loadUnit ?? null,
    distanceValue: values.distanceValue ?? null,
    distanceUnit: values.distanceUnit ?? null,
    durationSeconds: values.durationSeconds ?? null,
  };
}
