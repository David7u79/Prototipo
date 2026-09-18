/**
 * Restablece exclusivamente la cuenta de demostración con datos reproducibles.
 * La contraseña y el correo siempre provienen del entorno para no versionar credenciales.
 */
import 'dotenv/config';
import { hash } from '@node-rs/argon2';
import { NestFactory } from '@nestjs/core';
import { PrismaPg } from '@prisma/adapter-pg';
import { PASSWORD_MIN_LENGTH } from '@garfit/domain';
import { PrismaClient } from '../generated/prisma/client.js';
import type { AiService } from '../ai/ai.service.js';
import type { RecordsService } from '../records/records.service.js';
import type { WorkoutsService } from '../workouts/workouts.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

if (process.env.NODE_ENV === 'production' && process.env.DEMO_ALLOW_PRODUCTION !== 'true') {
  throw new Error('En producción define DEMO_ALLOW_PRODUCTION=true para confirmar el reinicio demo');
}

const email = requiredEnvironment('DEMO_USER_EMAIL').toLowerCase();
const password = requiredEnvironment('DEMO_USER_PASSWORD');
if (password.length < PASSWORD_MIN_LENGTH) {
  throw new Error(`DEMO_USER_PASSWORD debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`);
}
const databaseUrl = requiredEnvironment('DATABASE_URL');

// El proveedor simulado deja una evidencia local y repetible durante la defensa.
if (process.env.NODE_ENV !== 'production') {
  process.env.AI_PROVIDER = 'fake';
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

try {
  await assertCatalog();
  const user = await prepareUser();
  await clearDemoData(user.id);

  // AppModule lee el entorno al cargarse; se importa después de fijar el proveedor fake.
  const [{ AppModule }, { AiService }, { RecordsService }, { WorkoutsService }] = await Promise.all([
    import('../app.module.js'),
    import('../ai/ai.service.js'),
    import('../records/records.service.js'),
    import('../workouts/workouts.service.js'),
  ]);
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const workouts = app.get(WorkoutsService);
    const records = app.get(RecordsService);
    const ai = app.get(AiService);
    await createManualRecords(records, user.id);
    await createHistoricalWorkouts(workouts, user.id);
    await ai.giveConsent(user.id);
    await ai.analyzeProgress(user.id, 30);
  } finally {
    await app.close();
  }
  await printSummary(user.id);
} finally {
  await prisma.$disconnect();
}

function requiredEnvironment(name: 'DATABASE_URL' | 'DEMO_USER_EMAIL' | 'DEMO_USER_PASSWORD'): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} es obligatoria`);
  }
  return value;
}

async function assertCatalog(): Promise<void> {
  const required = ['barbell-full-squat', 'barbell-deadlift', 'barbell-bench-press'];
  const movements = await prisma.movement.findMany({
    where: { slug: { in: required }, isActive: true },
    select: { slug: true },
  });
  const fran = await prisma.wod.findUnique({ where: { slug: 'fran' }, select: { id: true } });
  if (movements.length !== required.length || !fran) {
    throw new Error('Falta el catálogo; ejecuta demo:reset para sembrarlo antes de la cuenta demo');
  }
}

async function prepareUser() {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name: 'Atleta demo', aiConsentAt: null },
    create: { email, name: 'Atleta demo' },
  });
  const passwordHash = await hash(password, { algorithm: 2 });
  await prisma.authAccount.upsert({
    where: { userId_provider: { userId: user.id, provider: 'LOCAL' } },
    update: { providerAccountId: email, passwordHash },
    create: { userId: user.id, provider: 'LOCAL', providerAccountId: email, passwordHash },
  });
  await prisma.athleteProfile.upsert({
    where: { userId: user.id },
    update: profileData(),
    create: { userId: user.id, ...profileData() },
  });
  return user;
}

function profileData() {
  return {
    displayName: 'Atleta demo',
    experienceLevel: 'INTERMEDIATE' as const,
    primaryGoal: 'STRENGTH' as const,
    preferredUnits: 'METRIC' as const,
  };
}

async function clearDemoData(userId: string): Promise<void> {
  // Se eliminan primero las marcas porque algunas apuntan a resultados con restricción NoAction.
  await prisma.personalRecord.deleteMany({ where: { userId } });
  await prisma.workout.deleteMany({ where: { userId } });
  await prisma.wod.deleteMany({ where: { ownerId: userId } });
  await prisma.aiAnalysis.deleteMany({ where: { userId } });
  await prisma.session.deleteMany({ where: { userId } });
}

async function createManualRecords(records: RecordsService, userId: string): Promise<void> {
  await records.create(userId, {
    movementSlug: 'barbell-bench-press',
    recordType: 'WEIGHT',
    value: 82.5,
    unit: 'KILOGRAM',
    repetitions: 1,
    distanceValue: null,
    distanceUnit: null,
    performedAt: daysAgo(18),
    notes: 'Marca manual de referencia para la demostración.',
  });
}

async function createHistoricalWorkouts(workouts: WorkoutsService, userId: string): Promise<void> {
  await completeStrengthWorkout(workouts, userId, 'Sentadilla 90 kg', 'barbell-full-squat', 90, 27);
  await completeStrengthWorkout(workouts, userId, 'Peso muerto 120 kg', 'barbell-deadlift', 120, 24);
  await completeFran(workouts, userId, 330, 23);
  await completeStrengthWorkout(workouts, userId, 'Sentadilla 100 kg', 'barbell-full-squat', 100, 20);
  await completeStrengthWorkout(workouts, userId, 'Peso muerto 135 kg', 'barbell-deadlift', 135, 16);
  await completeFran(workouts, userId, 306, 15);
  await completeStrengthWorkout(workouts, userId, 'Sentadilla 105 kg', 'barbell-full-squat', 105, 13);
  await completeStrengthWorkout(workouts, userId, 'Peso muerto 145 kg', 'barbell-deadlift', 145, 10);
  await completeStrengthWorkout(workouts, userId, 'Sentadilla 110 kg', 'barbell-full-squat', 110, 6);
  await completeFran(workouts, userId, 288, 5);

  // Estas sesiones caen en la ventana anterior para que la comparación de periodos sea visible.
  await completeStrengthWorkout(workouts, userId, 'Sentadilla técnica 80 kg', 'barbell-full-squat', 80, 38);
  await completeStrengthWorkout(workouts, userId, 'Peso muerto técnico 110 kg', 'barbell-deadlift', 110, 48);
}

async function completeStrengthWorkout(
  workouts: WorkoutsService,
  userId: string,
  name: string,
  movementSlug: string,
  loadValue: number,
  days: number,
): Promise<void> {
  const workout = await workouts.create(userId, {
    name,
    description: null,
    notes: null,
    workoutType: 'STRENGTH',
    durationSeconds: null,
    rounds: null,
    intervalSeconds: null,
    repScheme: [],
    exercises: [exercise(movementSlug)],
  });
  await workouts.start(userId, workout.id);
  await workouts.complete(userId, workout.id, {
    performedOn: daysAgo(days),
    results: {
      score: null,
      exercises: [{ exerciseId: workout.exercises[0]!.id, sets: [set(loadValue)] }],
    },
  });
}

async function completeFran(
  workouts: WorkoutsService,
  userId: string,
  timeSeconds: number,
  days: number,
): Promise<void> {
  const workout = await workouts.create(userId, {
    wodSlug: 'fran',
    description: null,
    notes: null,
    durationSeconds: null,
    rounds: null,
    intervalSeconds: null,
    repScheme: [],
  });
  await workouts.start(userId, workout.id);
  await workouts.complete(userId, workout.id, {
    performedOn: daysAgo(days),
    results: {
      score: { timeSeconds, repsAtTimeCap: null, rounds: null, extraReps: null, completed: null },
      exercises: [],
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

function set(loadValue: number) {
  return {
    setNumber: 1,
    reps: 1,
    loadValue,
    loadUnit: 'KILOGRAM' as const,
    distanceValue: null,
    distanceUnit: null,
    durationSeconds: null,
  };
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
}

async function printSummary(userId: string): Promise<void> {
  const [workouts, records, analyses, fran] = await Promise.all([
    prisma.workout.count({ where: { userId, status: 'COMPLETED', deletedAt: null } }),
    prisma.personalRecord.count({ where: { userId, deletedAt: null } }),
    prisma.aiAnalysis.count({ where: { userId } }),
    prisma.workout.count({
      where: { userId, status: 'COMPLETED', deletedAt: null, wod: { slug: 'fran' } },
    }),
  ]);
  console.log(`Demo lista: entrenamientos=${workouts}; marcas=${records}; análisis=${analyses}; fran=${fran}`);
}
