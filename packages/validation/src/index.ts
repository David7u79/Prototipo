/**
 * Esquemas de validación (Zod) de los formularios de GarFit.
 *
 * Las reglas (límites, enums, patrones) NO se definen aquí: vienen de `@garfit/domain` y
 * `@garfit/movements`, que también usa la API. Estos esquemas son comodidad para los clientes;
 * la API vuelve a validar porque es la frontera de confianza.
 *
 * @packageDocumentation
 */
import {
  type AiAnalysisType,
  AI_PERIOD_DAYS,
  DEFAULT_AI_PERIOD_DAYS,
  DISTANCE_UNITS,
  LOAD_UNITS,
  UUID_PATTERN,
  WORKOUT_LIMITS,
  WORKOUT_STATUSES,
  WORKOUT_TYPES,
  normalizeSet,
  requiresDistanceQualifier,
  validatePrescription,
  DISPLAY_NAME_MAX_LENGTH,
  EXPERIENCE_LEVELS,
  NAME_MAX_LENGTH,
  PAGINATION,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PRIMARY_GOALS,
  PROFILE_LIMITS,
  RECORD_LIMITS,
  RECORD_MIN_DATE,
  RECORD_NOTES_MAX_LENGTH,
  RECORD_REPETITIONS_LIMITS,
  RECORD_TYPES,
  RECORD_UNITS,
  RECORD_VALUE_MAX_DECIMALS,
  SEARCH_MAX_LENGTH,
  SLUG_MAX_LENGTH,
  SLUG_PATTERN,
  UNIT_SYSTEMS,
  ageInYears,
  isNotInFuture,
  isUnitAllowed,
  isValidIsoDate,
  toCanonical,
} from '@garfit/domain';
import {
  EQUIPMENT,
  MOVEMENT_CATEGORIES,
  MOVEMENT_DIFFICULTIES,
  MUSCLE_GROUPS,
} from '@garfit/movements';
import { z } from 'zod';

// Reexportadas para no romper a los clientes que ya las importaban desde aquí.
export {
  DISPLAY_NAME_MAX_LENGTH,
  EXPERIENCE_LEVELS,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PRIMARY_GOALS,
  UNIT_SYSTEMS,
};

const email = z.string().trim().toLowerCase().pipe(z.email('Correo electrónico inválido'));

const isoDate = z
  .string()
  .refine(isValidIsoDate, 'Fecha inválida (usa AAAA-MM-DD)')
  .refine((value) => isNotInFuture(value), 'La fecha no puede estar en el futuro');

const decimals = (value: number, max: number) =>
  Number.isInteger(Math.round(value * 10 ** max * 1e6) / 1e6);

// --- Autenticación -------------------------------------------------------------------------

/** Registro con correo y contraseña. */
export const registerSchema = z.object({
  email,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
    .max(PASSWORD_MAX_LENGTH, `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres`),
  name: z.string().trim().min(1, 'Escribe tu nombre').max(NAME_MAX_LENGTH),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** Inicio de sesión local. No aplica reglas de longitud para no filtrar la política. */
export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Escribe tu contraseña').max(PASSWORD_MAX_LENGTH),
});
export type LoginInput = z.infer<typeof loginSchema>;

// --- Perfil deportivo ----------------------------------------------------------------------

/**
 * Creación o reemplazo completo del perfil (`PUT /profile`). Altura en cm y peso en kg: los
 * clientes convierten desde libras antes de enviar. Los campos opcionales se envían como `null`.
 */
export const athleteProfileSchema = z
  .object({
    displayName: z.string().trim().min(1, 'Escribe un nombre visible').max(DISPLAY_NAME_MAX_LENGTH),
    experienceLevel: z.enum(EXPERIENCE_LEVELS),
    primaryGoal: z.enum(PRIMARY_GOALS),
    preferredUnits: z.enum(UNIT_SYSTEMS).default('METRIC'),
    birthDate: isoDate.nullable().default(null),
    heightCm: z
      .number()
      .min(PROFILE_LIMITS.heightCm.min, `La altura mínima es ${PROFILE_LIMITS.heightCm.min} cm`)
      .max(PROFILE_LIMITS.heightCm.max, `La altura máxima es ${PROFILE_LIMITS.heightCm.max} cm`)
      .refine((value) => decimals(value, 1), 'Usa como máximo 1 decimal')
      .nullable()
      .default(null),
    weightKg: z
      .number()
      .min(PROFILE_LIMITS.weightKg.min, `El peso mínimo es ${PROFILE_LIMITS.weightKg.min} kg`)
      .max(PROFILE_LIMITS.weightKg.max, `El peso máximo es ${PROFILE_LIMITS.weightKg.max} kg`)
      .refine((value) => decimals(value, 2), 'Usa como máximo 2 decimales')
      .nullable()
      .default(null),
    trainingSince: isoDate.nullable().default(null),
  })
  .superRefine((profile, ctx) => {
    if (profile.birthDate) {
      const age = ageInYears(profile.birthDate);
      if (age < PROFILE_LIMITS.ageYears.min || age > PROFILE_LIMITS.ageYears.max) {
        ctx.addIssue({
          code: 'custom',
          path: ['birthDate'],
          message: `La edad debe estar entre ${PROFILE_LIMITS.ageYears.min} y ${PROFILE_LIMITS.ageYears.max} años`,
        });
      }
    }
    if (profile.birthDate && profile.trainingSince && profile.trainingSince < profile.birthDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['trainingSince'],
        message: 'No puede ser anterior a la fecha de nacimiento',
      });
    }
  });
export type AthleteProfileInput = z.input<typeof athleteProfileSchema>;
export type AthleteProfilePayload = z.output<typeof athleteProfileSchema>;

// --- Marcas personales ---------------------------------------------------------------------

const recordValueFields = {
  value: z
    .number({ error: 'Escribe un número' })
    .positive('El valor debe ser mayor que 0')
    .refine(
      (value) => decimals(value, RECORD_VALUE_MAX_DECIMALS),
      `Usa como máximo ${RECORD_VALUE_MAX_DECIMALS} decimales`,
    ),
  unit: z.enum(RECORD_UNITS),
  repetitions: z
    .number()
    .int('Debe ser un número entero')
    .min(RECORD_REPETITIONS_LIMITS.min)
    .max(RECORD_REPETITIONS_LIMITS.max)
    .nullable(),
  performedAt: isoDate.refine(
    (value) => value >= RECORD_MIN_DATE,
    `La fecha no puede ser anterior a ${RECORD_MIN_DATE}`,
  ),
  notes: z.string().trim().max(RECORD_NOTES_MAX_LENGTH).nullable(),
  /** Calificador de TIME: distancia cronometrada. */
  distanceValue: positiveDecimal(RECORD_VALUE_MAX_DECIMALS).nullable(),
  distanceUnit: z.enum(DISTANCE_UNITS).nullable(),
};

/** Comprueba unidad, límites canónicos, repeticiones y calificador para un tipo de marca. */
function checkRecordValue(
  input: {
    recordType: (typeof RECORD_TYPES)[number];
    value?: number;
    unit?: (typeof RECORD_UNITS)[number];
    repetitions?: number | null;
    distanceValue?: number | null;
    distanceUnit?: (typeof DISTANCE_UNITS)[number] | null;
  },
  ctx: z.RefinementCtx,
): void {
  const { recordType, value, unit, repetitions, distanceValue, distanceUnit } = input;
  const hasDistance = distanceValue != null || distanceUnit != null;
  if (requiresDistanceQualifier(recordType)) {
    if (distanceValue == null || distanceUnit == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['distanceValue'],
        message: 'Indica la distancia sobre la que se midió el tiempo',
      });
    } else {
      const meters = toCanonical(distanceValue, distanceUnit);
      if (meters < RECORD_LIMITS.DISTANCE.min || meters > RECORD_LIMITS.DISTANCE.max) {
        ctx.addIssue({
          code: 'custom',
          path: ['distanceValue'],
          message: 'Distancia fuera de rango',
        });
      }
    }
  } else if (hasDistance) {
    ctx.addIssue({
      code: 'custom',
      path: ['distanceValue'],
      message: 'La distancia sólo califica marcas de tiempo',
    });
  }
  if (unit !== undefined && !isUnitAllowed(recordType, unit)) {
    ctx.addIssue({ code: 'custom', path: ['unit'], message: 'Unidad no válida para esta marca' });
    return;
  }
  if (value !== undefined && unit !== undefined) {
    const canonical = toCanonical(value, unit);
    const { min, max } = RECORD_LIMITS[recordType];
    if (canonical < min || canonical > max) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'Valor fuera del rango permitido' });
    }
  }
  if (recordType !== 'WEIGHT' && repetitions !== undefined && repetitions !== null) {
    ctx.addIssue({
      code: 'custom',
      path: ['repetitions'],
      message: 'Las repeticiones sólo aplican a marcas de peso',
    });
  }
}

/** `POST /records`. En marcas de peso, `repetitions` es obligatorio (1 = 1RM). */
export const createRecordSchema = z
  .object({
    movementSlug: z.string().max(SLUG_MAX_LENGTH).regex(SLUG_PATTERN, 'Movimiento inválido'),
    recordType: z.enum(RECORD_TYPES),
    ...recordValueFields,
    repetitions: recordValueFields.repetitions.default(null),
    notes: recordValueFields.notes.default(null),
    distanceValue: recordValueFields.distanceValue.default(null),
    distanceUnit: recordValueFields.distanceUnit.default(null),
  })
  .superRefine((input, ctx) => {
    checkRecordValue(input, ctx);
    if (input.recordType === 'WEIGHT' && input.repetitions === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['repetitions'],
        message: 'Indica las repeticiones (1 para 1RM)',
      });
    }
  });
export type CreateRecordInput = z.input<typeof createRecordSchema>;

/**
 * `PATCH /records/:id`. El movimiento y el tipo no cambian (se registra otra marca); si se
 * cambia `value` debe enviarse `unit`. Validar el tipo contra el registro existente es tarea de
 * la API; `forRecordType` permite al cliente hacerlo antes.
 */
export const updateRecordSchema = z
  .object({
    value: recordValueFields.value.optional(),
    unit: recordValueFields.unit.optional(),
    repetitions: recordValueFields.repetitions.optional(),
    performedAt: recordValueFields.performedAt.optional(),
    notes: recordValueFields.notes.optional(),
    distanceValue: recordValueFields.distanceValue.optional(),
    distanceUnit: recordValueFields.distanceUnit.optional(),
  })
  .refine((input) => Object.keys(input).length > 0, 'No hay cambios que guardar')
  .refine(
    (input) => (input.value === undefined) === (input.unit === undefined),
    'El valor y la unidad se envían juntos',
  )
  .refine(
    (input) => (input.distanceValue === undefined) === (input.distanceUnit === undefined),
    'La distancia y su unidad se envían juntas',
  );
export type UpdateRecordInput = z.input<typeof updateRecordSchema>;

/**
 * Valida un PATCH conociendo la marca existente. Las reglas se aplican sobre el resultado final
 * (campos nuevos + los que no cambian), así un PATCH de sólo notas en un TIME no exige distancia.
 */
export function updateRecordSchemaFor(existing: {
  recordType: (typeof RECORD_TYPES)[number];
  distanceValue: number | null;
  distanceUnit: (typeof DISTANCE_UNITS)[number] | null;
}) {
  return updateRecordSchema.superRefine((input, ctx) =>
    checkRecordValue(
      {
        recordType: existing.recordType,
        ...input,
        distanceValue:
          input.distanceValue === undefined ? existing.distanceValue : input.distanceValue,
        distanceUnit: input.distanceUnit === undefined ? existing.distanceUnit : input.distanceUnit,
      },
      ctx,
    ),
  );
}

// --- Entrenamientos y WODs -----------------------------------------------------------------

function positiveDecimal(maxDecimals: number) {
  return z
    .number({ error: 'Escribe un número' })
    .positive('Debe ser mayor que 0')
    .refine((value) => decimals(value, maxDecimals), `Usa como máximo ${maxDecimals} decimales`);
}

const optionalInt = (min: number, max: number) =>
  z.number().int('Debe ser un número entero').min(min).max(max).nullable().default(null);

const slugSchema = z.string().max(SLUG_MAX_LENGTH).regex(SLUG_PATTERN, 'Identificador inválido');

/** Valor + unidad que deben enviarse juntos. */
function pairIssue(
  value: number | null | undefined,
  unit: string | null | undefined,
  path: string,
  ctx: z.RefinementCtx,
) {
  if ((value == null) !== (unit == null)) {
    ctx.addIssue({ code: 'custom', path: [path], message: 'El valor y su unidad van juntos' });
  }
}

const prescriptionFields = {
  workoutType: z.enum(WORKOUT_TYPES),
  durationSeconds: optionalInt(
    WORKOUT_LIMITS.durationSeconds.min,
    WORKOUT_LIMITS.durationSeconds.max,
  ),
  rounds: optionalInt(1, WORKOUT_LIMITS.rounds.max),
  intervalSeconds: optionalInt(
    WORKOUT_LIMITS.intervalSeconds.min,
    WORKOUT_LIMITS.intervalSeconds.max,
  ),
  repScheme: z
    .array(z.number().int().min(1).max(WORKOUT_LIMITS.repsPerSet.max))
    .max(WORKOUT_LIMITS.repSchemeMaxLength)
    .default([]),
};

function checkPrescription(
  input: {
    workoutType: (typeof WORKOUT_TYPES)[number];
    durationSeconds: number | null;
    rounds: number | null;
    intervalSeconds: number | null;
    repScheme: number[];
  },
  ctx: z.RefinementCtx,
) {
  for (const message of validatePrescription(input.workoutType, input)) {
    ctx.addIssue({ code: 'custom', path: ['workoutType'], message });
  }
}

/** Movimiento prescrito en un entrenamiento. El orden del array es el orden del entrenamiento. */
export const workoutExerciseInputSchema = z
  .object({
    movementSlug: slugSchema,
    targetSets: optionalInt(1, WORKOUT_LIMITS.maxSetsPerExercise),
    targetReps: optionalInt(1, WORKOUT_LIMITS.repsPerSet.max),
    targetLoadValue: positiveDecimal(RECORD_VALUE_MAX_DECIMALS).nullable().default(null),
    targetLoadUnit: z.enum(LOAD_UNITS).nullable().default(null),
    targetDistanceValue: positiveDecimal(RECORD_VALUE_MAX_DECIMALS).nullable().default(null),
    targetDistanceUnit: z.enum(DISTANCE_UNITS).nullable().default(null),
    targetDurationSeconds: optionalInt(
      WORKOUT_LIMITS.durationSeconds.min,
      WORKOUT_LIMITS.durationSeconds.max,
    ),
    restSeconds: optionalInt(WORKOUT_LIMITS.restSeconds.min, WORKOUT_LIMITS.restSeconds.max),
    notes: z.string().trim().max(WORKOUT_LIMITS.notesMaxLength).nullable().default(null),
  })
  .superRefine((input, ctx) => {
    pairIssue(input.targetLoadValue, input.targetLoadUnit, 'targetLoadValue', ctx);
    pairIssue(input.targetDistanceValue, input.targetDistanceUnit, 'targetDistanceValue', ctx);
  });
export type WorkoutExerciseInput = z.input<typeof workoutExerciseInputSchema>;

const workoutBaseFields = {
  name: z.string().trim().min(1, 'Escribe un nombre').max(WORKOUT_LIMITS.nameMaxLength),
  description: z.string().trim().max(WORKOUT_LIMITS.descriptionMaxLength).nullable().default(null),
  notes: z.string().trim().max(WORKOUT_LIMITS.notesMaxLength).nullable().default(null),
  ...prescriptionFields,
  exercises: z
    .array(workoutExerciseInputSchema)
    .min(1, 'Agrega al menos un movimiento')
    .max(WORKOUT_LIMITS.maxExercises),
};

/**
 * `POST /workouts`: libre (`name`, `workoutType`, `exercises`…) o desde un WOD (`wodSlug`, que
 * copia su prescripción; `name` opcional para renombrarlo). No se admiten ambos.
 */
export const createWorkoutSchema = z.union([
  z.object({ wodSlug: slugSchema, name: workoutBaseFields.name.optional() }).strict(),
  z.object(workoutBaseFields).strict().superRefine(checkPrescription),
]);
export type CreateWorkoutInput = z.input<typeof createWorkoutSchema>;

/** `PATCH /workouts/:id` (sólo DRAFT). Reemplaza los campos enviados; `exercises` reemplaza la lista. */
export const updateWorkoutSchema = z
  .object({
    name: workoutBaseFields.name.optional(),
    description: z.string().trim().max(WORKOUT_LIMITS.descriptionMaxLength).nullable().optional(),
    notes: z.string().trim().max(WORKOUT_LIMITS.notesMaxLength).nullable().optional(),
    exercises: workoutBaseFields.exercises.optional(),
  })
  .strict()
  .refine((input) => Object.values(input).some((value) => value !== undefined), 'No hay cambios');
export type UpdateWorkoutInput = z.input<typeof updateWorkoutSchema>;

export const workoutSetInputSchema = z
  .object({
    setNumber: z.number().int().min(1).max(WORKOUT_LIMITS.maxSetsPerExercise),
    reps: optionalInt(WORKOUT_LIMITS.repsPerSet.min, WORKOUT_LIMITS.repsPerSet.max),
    loadValue: positiveDecimal(RECORD_VALUE_MAX_DECIMALS).nullable().default(null),
    loadUnit: z.enum(LOAD_UNITS).nullable().default(null),
    distanceValue: positiveDecimal(RECORD_VALUE_MAX_DECIMALS).nullable().default(null),
    distanceUnit: z.enum(DISTANCE_UNITS).nullable().default(null),
    durationSeconds: optionalInt(
      WORKOUT_LIMITS.durationSeconds.min,
      WORKOUT_LIMITS.durationSeconds.max,
    ),
  })
  .strict()
  .superRefine((input, ctx) => {
    for (const message of normalizeSet(input).errors) {
      ctx.addIssue({ code: 'custom', path: ['setNumber'], message });
    }
  });
export type WorkoutSetInput = z.input<typeof workoutSetInputSchema>;

export const workoutScoreInputSchema = z
  .object({
    timeSeconds: optionalInt(
      WORKOUT_LIMITS.durationSeconds.min,
      WORKOUT_LIMITS.durationSeconds.max,
    ),
    repsAtTimeCap: optionalInt(0, 100_000),
    rounds: optionalInt(WORKOUT_LIMITS.rounds.min, WORKOUT_LIMITS.rounds.max),
    extraReps: optionalInt(WORKOUT_LIMITS.repsPerSet.min, WORKOUT_LIMITS.repsPerSet.max),
    completed: z.boolean().nullable().default(null),
  })
  .strict();
export type WorkoutScoreInput = z.input<typeof workoutScoreInputSchema>;

/**
 * `PUT /workouts/:id/results`: reemplaza todos los resultados y el score. Cada ejercicio se
 * identifica por su id y sus series por `setNumber` (únicos). Límite total de series.
 */
export const workoutResultsSchema = z
  .object({
    exercises: z
      .array(
        z
          .object({
            exerciseId: z.string().regex(UUID_PATTERN, 'Identificador inválido'),
            sets: z.array(workoutSetInputSchema).max(WORKOUT_LIMITS.maxSetsPerExercise),
          })
          .strict(),
      )
      .max(WORKOUT_LIMITS.maxExercises),
    score: workoutScoreInputSchema.nullable().default(null),
  })
  .strict()
  .superRefine((input, ctx) => {
    const exerciseIds = input.exercises.map((exercise) => exercise.exerciseId);
    if (new Set(exerciseIds).size !== exerciseIds.length) {
      ctx.addIssue({ code: 'custom', path: ['exercises'], message: 'Ejercicio repetido' });
    }
    input.exercises.forEach((exercise, index) => {
      const numbers = exercise.sets.map((set) => set.setNumber);
      if (new Set(numbers).size !== numbers.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['exercises', index, 'sets'],
          message: 'Serie repetida',
        });
      }
    });
    const totalSets = input.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
    if (totalSets > WORKOUT_LIMITS.maxTotalSets) {
      ctx.addIssue({
        code: 'custom',
        path: ['exercises'],
        message: `Como máximo ${WORKOUT_LIMITS.maxTotalSets} series por entrenamiento`,
      });
    }
  });
export type WorkoutResultsInput = z.input<typeof workoutResultsSchema>;

/**
 * `POST /workouts/:id/complete`. Puede incluir los resultados para guardarlos y completar en
 * una sola operación. `performedOn` por defecto es hoy.
 */
export const completeWorkoutSchema = z
  .object({
    performedOn: isoDate.optional(),
    results: workoutResultsSchema.optional(),
  })
  .strict();
export type CompleteWorkoutInput = z.input<typeof completeWorkoutSchema>;

/** Query de `GET /workouts`. */
export const workoutFiltersSchema = z
  .object({
    from: z.string().refine(isValidIsoDate, 'Fecha inválida').optional(),
    to: z.string().refine(isValidIsoDate, 'Fecha inválida').optional(),
    movement: slugSchema.optional(),
    workoutType: z.enum(WORKOUT_TYPES).optional(),
    status: z.enum(WORKOUT_STATUSES).optional(),
    page: z.coerce.number().int().min(1).max(PAGINATION.maxPage).default(1),
    limit: z.coerce.number().int().min(1).max(PAGINATION.maxLimit).default(PAGINATION.defaultLimit),
  })
  .refine((input) => !input.from || !input.to || input.from <= input.to, {
    message: '`from` debe ser anterior o igual a `to`',
    path: ['from'],
  });
export type WorkoutFiltersInput = z.input<typeof workoutFiltersSchema>;

/** Movimiento de un WOD personal. */
export const wodExerciseInputSchema = z
  .object({
    movementSlug: slugSchema,
    reps: optionalInt(1, WORKOUT_LIMITS.repsPerSet.max),
    loadValue: positiveDecimal(RECORD_VALUE_MAX_DECIMALS).nullable().default(null),
    loadUnit: z.enum(LOAD_UNITS).nullable().default(null),
    distanceValue: positiveDecimal(RECORD_VALUE_MAX_DECIMALS).nullable().default(null),
    distanceUnit: z.enum(DISTANCE_UNITS).nullable().default(null),
    durationSeconds: optionalInt(
      WORKOUT_LIMITS.durationSeconds.min,
      WORKOUT_LIMITS.durationSeconds.max,
    ),
    notes: z.string().trim().max(WORKOUT_LIMITS.notesMaxLength).nullable().default(null),
  })
  .strict()
  .superRefine((input, ctx) => {
    pairIssue(input.loadValue, input.loadUnit, 'loadValue', ctx);
    pairIssue(input.distanceValue, input.distanceUnit, 'distanceValue', ctx);
  });

/** `POST /wods`: WOD personal y privado del atleta. */
export const createWodSchema = z
  .object({
    name: workoutBaseFields.name,
    description: workoutBaseFields.description,
    ...prescriptionFields,
    exercises: z.array(wodExerciseInputSchema).min(1).max(WORKOUT_LIMITS.maxExercises),
  })
  .strict()
  .superRefine(checkPrescription);
export type CreateWodInput = z.input<typeof createWodSchema>;

/** Query de `GET /wods`. `benchmark` llega como "true"/"false" en la query string. */
export const wodFiltersSchema = z.object({
  search: z.string().trim().max(SEARCH_MAX_LENGTH).optional(),
  workoutType: z.enum(WORKOUT_TYPES).optional(),
  benchmark: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).max(PAGINATION.maxPage).default(1),
  limit: z.coerce.number().int().min(1).max(PAGINATION.maxLimit).default(PAGINATION.defaultLimit),
});
export type WodFiltersInput = z.input<typeof wodFiltersSchema>;

// --- Filtros -------------------------------------------------------------------------------

/** Query de `GET /movements`. Acepta strings (query string) y los convierte. */
export const movementFiltersSchema = z.object({
  search: z.string().trim().max(SEARCH_MAX_LENGTH).optional(),
  category: z.enum(MOVEMENT_CATEGORIES).optional(),
  equipment: z.enum(EQUIPMENT).optional(),
  muscleGroup: z.enum(MUSCLE_GROUPS).optional(),
  difficulty: z.enum(MOVEMENT_DIFFICULTIES).optional(),
  recordType: z.enum(RECORD_TYPES).optional(),
  page: z.coerce.number().int().min(1).max(PAGINATION.maxPage).default(1),
  limit: z.coerce.number().int().min(1).max(PAGINATION.maxLimit).default(PAGINATION.defaultLimit),
});
export type MovementFiltersInput = z.input<typeof movementFiltersSchema>;

// --- Etiquetas -----------------------------------------------------------------------------

/** Etiquetas en español para mostrar los enums en la UI. */
export const EXPERIENCE_LEVEL_LABELS: Record<(typeof EXPERIENCE_LEVELS)[number], string> = {
  BEGINNER: 'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
};

export const PRIMARY_GOAL_LABELS: Record<(typeof PRIMARY_GOALS)[number], string> = {
  STRENGTH: 'Fuerza',
  ENDURANCE: 'Resistencia',
  HYPERTROPHY: 'Hipertrofia',
  WEIGHT_LOSS: 'Pérdida de peso',
  GENERAL_FITNESS: 'Condición general',
};

export const UNIT_SYSTEM_LABELS: Record<(typeof UNIT_SYSTEMS)[number], string> = {
  METRIC: 'Métrico (kg, km)',
  IMPERIAL: 'Imperial (lb, mi)',
};

export const RECORD_TYPE_LABELS: Record<(typeof RECORD_TYPES)[number], string> = {
  WEIGHT: 'Peso',
  REPS: 'Repeticiones',
  DISTANCE: 'Distancia',
  DURATION: 'Duración',
  TIME: 'Tiempo',
};

export const RECORD_UNIT_LABELS: Record<(typeof RECORD_UNITS)[number], string> = {
  KILOGRAM: 'kg',
  POUND: 'lb',
  REPETITION: 'repeticiones',
  METER: 'm',
  KILOMETER: 'km',
  MILE: 'mi',
  SECOND: 'segundos',
};

export const WORKOUT_TYPE_LABELS: Record<(typeof WORKOUT_TYPES)[number], string> = {
  STRENGTH: 'Fuerza',
  FOR_TIME: 'Por tiempo',
  AMRAP: 'AMRAP',
  EMOM: 'EMOM',
  CARDIO: 'Cardio',
  CUSTOM: 'Personalizado',
};

export const WORKOUT_STATUS_LABELS: Record<(typeof WORKOUT_STATUSES)[number], string> = {
  DRAFT: 'Borrador',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completado',
};

/* ---------------------------------------------------------------------------------------- */
/* IA explicativa (fase 4)                                                                   */
/* ---------------------------------------------------------------------------------------- */

/** Límites de la salida estructurada que se exige al modelo. */
export const AI_OUTPUT_LIMITS = {
  summary: 800,
  title: 120,
  description: 600,
  observations: 6,
  suggestions: 4,
  evidencePerItem: 8,
  notes: 5,
  noteLength: 300,
} as const;

const aiText = (max: number) => z.string().trim().min(1).max(max);

const aiItemSchema = (minEvidence: number) =>
  z
    .object({
      title: aiText(AI_OUTPUT_LIMITS.title),
      description: aiText(AI_OUTPUT_LIMITS.description),
      evidenceIds: z
        .array(z.string().min(1).max(200))
        .min(minEvidence)
        .max(AI_OUTPUT_LIMITS.evidencePerItem),
    })
    .strict();

/**
 * Salida del modelo. Se envía como JSON Schema al proveedor y se vuelve a validar aquí al
 * recibirla: nunca se confía sólo en que el proveedor respete el esquema. Toda observación
 * cita al menos una evidencia; una sugerencia puede ser general (sin evidencia).
 */
export const aiModelOutputSchema = z
  .object({
    status: z.enum(['COMPLETED', 'INSUFFICIENT_DATA']),
    summary: aiText(AI_OUTPUT_LIMITS.summary),
    observations: z.array(aiItemSchema(1)).max(AI_OUTPUT_LIMITS.observations),
    suggestions: z.array(aiItemSchema(0)).max(AI_OUTPUT_LIMITS.suggestions),
    limitations: z.array(aiText(AI_OUTPUT_LIMITS.noteLength)).max(AI_OUTPUT_LIMITS.notes),
    missingData: z.array(aiText(AI_OUTPUT_LIMITS.noteLength)).max(AI_OUTPUT_LIMITS.notes),
  })
  .strict();

/** JSON Schema de `aiModelOutputSchema` para la salida estructurada del proveedor. */
export const aiModelOutputJsonSchema = z.toJSONSchema(aiModelOutputSchema, {
  target: 'draft-2020-12',
});

/** Cuerpo opcional de `POST /ai/analyze/progress`. */
export const aiProgressRequestSchema = z
  .object({
    periodDays: z
      .union(AI_PERIOD_DAYS.map((days) => z.literal(days)))
      .default(DEFAULT_AI_PERIOD_DAYS),
  })
  .strict();

export const AI_ANALYSIS_TYPE_LABELS: Record<AiAnalysisType, string> = {
  PROGRESS_ANALYSIS: 'Análisis de progreso',
  WORKOUT_ANALYSIS: 'Análisis de entrenamiento',
  WOD_EXPLANATION: 'Explicación de WOD',
  MOVEMENT_EXPLANATION: 'Explicación de movimiento',
};
