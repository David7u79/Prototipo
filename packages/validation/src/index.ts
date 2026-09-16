/**
 * Esquemas de validación (Zod) de los formularios de GarFit.
 *
 * Los clientes validan con estos esquemas antes de llamar a la API. La API
 * valida de nuevo con sus DTOs usando las mismas constantes
 * ({@link PASSWORD_MIN_LENGTH}, etc.): la validación del cliente es
 * comodidad, la del servidor es la frontera de confianza.
 *
 * @packageDocumentation
 */
import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 80;
export const DISPLAY_NAME_MAX_LENGTH = 40;

export const EXPERIENCE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export const PRIMARY_GOALS = [
  'STRENGTH',
  'ENDURANCE',
  'HYPERTROPHY',
  'WEIGHT_LOSS',
  'GENERAL_FITNESS',
] as const;

const email = z.string().trim().toLowerCase().pipe(z.email('Correo electrónico inválido'));

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

/** Creación o actualización completa del perfil deportivo (`PUT /profile`). */
export const athleteProfileSchema = z.object({
  displayName: z.string().trim().min(1, 'Escribe un nombre visible').max(DISPLAY_NAME_MAX_LENGTH),
  experienceLevel: z.enum(EXPERIENCE_LEVELS),
  primaryGoal: z.enum(PRIMARY_GOALS),
});
export type AthleteProfileInput = z.infer<typeof athleteProfileSchema>;

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
