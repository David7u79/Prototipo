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
    displayName: z
      .string()
      .trim()
      .min(1, 'Escribe un nombre visible')
      .max(DISPLAY_NAME_MAX_LENGTH),
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
};

/** Comprueba unidad, límites canónicos y repeticiones para un tipo de marca conocido. */
function checkRecordValue(
  input: {
    recordType: (typeof RECORD_TYPES)[number];
    value?: number;
    unit?: (typeof RECORD_UNITS)[number];
    repetitions?: number | null;
  },
  ctx: z.RefinementCtx,
): void {
  const { recordType, value, unit, repetitions } = input;
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
  })
  .refine((input) => Object.keys(input).length > 0, 'No hay cambios que guardar')
  .refine(
    (input) => (input.value === undefined) === (input.unit === undefined),
    'El valor y la unidad se envían juntos',
  );
export type UpdateRecordInput = z.input<typeof updateRecordSchema>;

/** Valida un PATCH conociendo el tipo de la marca existente. */
export function updateRecordSchemaFor(recordType: (typeof RECORD_TYPES)[number]) {
  return updateRecordSchema.superRefine((input, ctx) => checkRecordValue({ recordType, ...input }, ctx));
}

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
