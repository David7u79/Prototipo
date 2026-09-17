import type { DistanceUnit, LoadUnit, WorkoutType } from '@garfit/domain';

/**
 * WODs de referencia ("benchmarks") del catálogo público de GarFit. Son pocas definiciones de
 * uso común en el entrenamiento funcional, escritas por el proyecto a partir de su prescripción
 * ampliamente publicada; no se copia ningún dataset. GarFit no está afiliado a ninguna marca
 * registrada de entrenamiento. Las cargas son las publicadas para la versión masculina; la
 * femenina se indica en `notes` para no inventar una escala.
 */
export const BENCHMARK_SOURCE = 'garfit-benchmarks';

export interface BenchmarkWodExercise {
  movementSlug: string;
  reps: number | null;
  loadValue: number | null;
  loadUnit: LoadUnit | null;
  distanceValue: number | null;
  distanceUnit: DistanceUnit | null;
  durationSeconds: number | null;
  notes: string | null;
}

export interface BenchmarkWod {
  slug: string;
  name: string;
  description: string;
  workoutType: WorkoutType;
  durationSeconds: number | null;
  rounds: number | null;
  intervalSeconds: number | null;
  repScheme: number[];
  exercises: BenchmarkWodExercise[];
}

const exercise = (
  movementSlug: string,
  fields: Partial<Omit<BenchmarkWodExercise, 'movementSlug'>> = {},
): BenchmarkWodExercise => ({
  movementSlug,
  reps: null,
  loadValue: null,
  loadUnit: null,
  distanceValue: null,
  distanceUnit: null,
  durationSeconds: null,
  notes: null,
  ...fields,
});

export const BENCHMARK_WODS: readonly BenchmarkWod[] = [
  {
    slug: 'fran',
    name: 'Fran',
    description: '21-15-9 repeticiones por tiempo de thrusters y dominadas.',
    workoutType: 'FOR_TIME',
    durationSeconds: null,
    rounds: null,
    intervalSeconds: null,
    repScheme: [21, 15, 9],
    exercises: [
      exercise('barbell-thruster', {
        loadValue: 95,
        loadUnit: 'POUND',
        notes: 'Carga publicada: 95 lb / 65 lb',
      }),
      exercise('pull-up'),
    ],
  },
  {
    slug: 'grace',
    name: 'Grace',
    description: '30 clean and jerks por tiempo.',
    workoutType: 'FOR_TIME',
    durationSeconds: null,
    rounds: null,
    intervalSeconds: null,
    repScheme: [],
    exercises: [
      exercise('barbell-clean-and-jerk', {
        reps: 30,
        loadValue: 135,
        loadUnit: 'POUND',
        notes: 'Carga publicada: 135 lb / 95 lb',
      }),
    ],
  },
  {
    slug: 'helen',
    name: 'Helen',
    description: '3 rondas por tiempo: correr 400 m, 21 kettlebell swings y 12 dominadas.',
    workoutType: 'FOR_TIME',
    durationSeconds: null,
    rounds: 3,
    intervalSeconds: null,
    repScheme: [],
    exercises: [
      exercise('run', { distanceValue: 400, distanceUnit: 'METER' }),
      exercise('kettlebell-swing', {
        reps: 21,
        loadValue: 24,
        loadUnit: 'KILOGRAM',
        notes: 'Carga publicada: 24 kg / 16 kg',
      }),
      exercise('pull-up', { reps: 12 }),
    ],
  },
  {
    slug: 'diane',
    name: 'Diane',
    description: '21-15-9 repeticiones por tiempo de peso muerto y flexiones en parada de manos.',
    workoutType: 'FOR_TIME',
    durationSeconds: null,
    rounds: null,
    intervalSeconds: null,
    repScheme: [21, 15, 9],
    exercises: [
      exercise('barbell-deadlift', {
        loadValue: 225,
        loadUnit: 'POUND',
        notes: 'Carga publicada: 225 lb / 155 lb',
      }),
      exercise('handstand-push-up'),
    ],
  },
  {
    slug: 'karen',
    name: 'Karen',
    description: '150 wall balls por tiempo.',
    workoutType: 'FOR_TIME',
    durationSeconds: null,
    rounds: null,
    intervalSeconds: null,
    repScheme: [],
    exercises: [
      exercise('wall-ball', {
        reps: 150,
        loadValue: 20,
        loadUnit: 'POUND',
        notes: 'Balón publicado: 20 lb / 14 lb',
      }),
    ],
  },
  {
    slug: 'cindy',
    name: 'Cindy',
    description: 'AMRAP de 20 minutos: 5 dominadas, 10 flexiones y 15 sentadillas.',
    workoutType: 'AMRAP',
    durationSeconds: 1200,
    rounds: null,
    intervalSeconds: null,
    repScheme: [],
    exercises: [
      exercise('pull-up', { reps: 5 }),
      exercise('push-up', { reps: 10 }),
      exercise('air-squat', { reps: 15 }),
    ],
  },
];
