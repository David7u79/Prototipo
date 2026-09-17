import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaService } from '../src/prisma/prisma.service.js';

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

type CreatedWorkout = {
  id: string;
  exercises: { id: string }[];
  [key: string]: unknown;
};

let userCounter = 0;

/** Registra un usuario nuevo y devuelve su access token. */
export async function registerUser(app: INestApplication, name = 'Atleta'): Promise<string> {
  userCounter += 1;
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      email: `atleta${userCounter}-${Date.now()}@example.com`,
      password: 'password123',
      name,
    })
    .expect(201);
  return response.body.tokens.accessToken as string;
}

/** Catálogo pequeño y controlado para tests (el catálogo real se prueba en la semilla). */
export const TEST_MOVEMENTS = [
  {
    slug: 'barbell-full-squat',
    name: 'Barbell full squat',
    category: 'UPPER_LEGS',
    equipment: 'BARBELL',
    primaryMuscles: ['GLUTES'],
    secondaryMuscles: ['QUADRICEPS', 'HAMSTRINGS'],
    recordTypes: ['WEIGHT', 'REPS'],
    instructions: ['Baja con control.', 'Sube empujando con los talones.'],
  },
  {
    slug: 'barbell-deadlift',
    name: 'Barbell deadlift',
    category: 'UPPER_LEGS',
    equipment: 'BARBELL',
    primaryMuscles: ['GLUTES'],
    secondaryMuscles: ['LOWER_BACK'],
    recordTypes: ['WEIGHT', 'REPS'],
    instructions: ['Levanta la barra desde el suelo.'],
  },
  {
    slug: 'pull-up',
    name: 'Pull-up',
    category: 'BACK',
    equipment: 'BODY_WEIGHT',
    primaryMuscles: ['LATS'],
    secondaryMuscles: ['BICEPS'],
    recordTypes: ['REPS'],
    instructions: ['Sube hasta pasar la barbilla.'],
  },
  {
    slug: 'front-plank',
    name: 'Front plank',
    category: 'WAIST',
    equipment: 'BODY_WEIGHT',
    primaryMuscles: ['ABS'],
    secondaryMuscles: ['OBLIQUES'],
    recordTypes: ['REPS', 'DURATION'],
    instructions: ['Mantén la posición.'],
  },
  {
    slug: 'run',
    name: 'Run',
    category: 'CARDIO',
    equipment: 'BODY_WEIGHT',
    primaryMuscles: ['CARDIOVASCULAR_SYSTEM'],
    secondaryMuscles: ['QUADRICEPS', 'CALVES'],
    recordTypes: ['REPS', 'DISTANCE', 'DURATION', 'TIME'],
    instructions: ['Corre a ritmo constante.'],
  },
  {
    slug: 'dumbbell-curl',
    name: 'Dumbbell curl',
    category: 'UPPER_ARMS',
    equipment: 'DUMBBELL',
    primaryMuscles: ['BICEPS'],
    secondaryMuscles: ['FOREARMS'],
    recordTypes: ['WEIGHT', 'REPS'],
    instructions: ['Flexiona el codo.'],
  },
] as const;

export async function seedTestMovements(prisma: PrismaService): Promise<void> {
  await prisma.movement.createMany({
    data: TEST_MOVEMENTS.map((movement) => ({
      ...movement,
      primaryMuscles: [...movement.primaryMuscles],
      secondaryMuscles: [...movement.secondaryMuscles],
      recordTypes: [...movement.recordTypes],
      instructions: [...movement.instructions],
      source: 'test',
    })),
  });
  // Movimiento retirado del catálogo: no debe listarse.
  await prisma.movement.create({
    data: {
      slug: 'retired-movement',
      name: 'Barbell retired movement',
      category: 'UPPER_LEGS',
      equipment: 'BARBELL',
      primaryMuscles: ['GLUTES'],
      secondaryMuscles: [],
      recordTypes: ['WEIGHT'],
      instructions: [],
      source: 'test',
      isActive: false,
    },
  });
}

/** Fecha `YYYY-MM-DD` de hace `days` días. */
export function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Crea un borrador libre con los campos que exige la prescripción. */
export function workoutDraft(
  name: string,
  workoutType: 'STRENGTH' | 'FOR_TIME' | 'AMRAP' | 'CARDIO' = 'STRENGTH',
  movementSlug = 'barbell-full-squat',
  extra: object = {},
) {
  return {
    name,
    workoutType,
    description: null,
    notes: null,
    durationSeconds: workoutType === 'AMRAP' ? 600 : null,
    rounds: null,
    intervalSeconds: null,
    repScheme: [],
    exercises: [
      {
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
      },
    ],
    ...extra,
  };
}

/** Crea un entrenamiento y devuelve su detalle. */
export async function createWorkout(
  app: INestApplication,
  token: string,
  body: object,
): Promise<CreatedWorkout> {
  const response = await request(app.getHttpServer())
    .post('/workouts')
    .set(bearer(token))
    .send(body)
    .expect(201);
  return response.body;
}

/** Completa un entrenamiento incluyendo resultados en la misma petición. */
export function completeWorkout(
  app: INestApplication,
  token: string,
  workoutId: string,
  results: object,
  performedOn?: string,
) {
  return request(app.getHttpServer())
    .post(`/workouts/${workoutId}/complete`)
    .set(bearer(token))
    .send({ results, ...(performedOn ? { performedOn } : {}) });
}

/** Resultado con una sola serie, útil para fuerza y cardio. */
export function oneSet(exerciseId: string, set: object, score: object | null = null) {
  return { exercises: [{ exerciseId, sets: [set] }], score };
}
