import type { RecordType } from '@garfit/domain';
import { SLUG_MAX_LENGTH } from '@garfit/domain';
import { recordTypesFor } from './record-types.js';
import type { Equipment, MovementCategory, MuscleGroup } from './taxonomy.js';

/**
 * Transformación explícita y reproducible de hasaneyldrm/exercises-dataset al catálogo de
 * GarFit. Sólo toma datos cubiertos por su licencia MIT (nombres, estructura, instrucciones);
 * NO toma imágenes ni videos (© Gym visual, fuera de la MIT).
 */

export const SOURCE = {
  repository: 'hasaneyldrm/exercises-dataset',
  /** Commit fijado: regenerar con otro commit es una decisión explícita, no un efecto lateral. */
  commit: '7455efae41b330c265e7cd4b78dfa848e7ce5ebd',
  path: 'data/exercises.json',
  license: 'MIT (datos e instrucciones; la media está excluida)',
} as const;

export const SOURCE_URL = `https://raw.githubusercontent.com/${SOURCE.repository}/${SOURCE.commit}/${SOURCE.path}`;

/** Registro tal como viene de la fuente (sólo los campos que se usan). */
export interface SourceExercise {
  id: string;
  name: string;
  body_part: string;
  equipment: string;
  target: string;
  secondary_muscles: string[];
  instruction_steps: Record<string, string[] | undefined>;
}

/** Movimiento del catálogo de GarFit, listo para sembrarse en la base de datos. */
export interface CatalogMovement {
  slug: string;
  sourceId: string;
  name: string;
  category: MovementCategory;
  equipment: Equipment;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  /** Pasos en español tomados de la fuente. */
  instructions: string[];
  recordTypes: RecordType[];
}

const CATEGORY_MAP: Record<string, MovementCategory> = {
  waist: 'WAIST',
  'upper legs': 'UPPER_LEGS',
  'lower legs': 'LOWER_LEGS',
  back: 'BACK',
  chest: 'CHEST',
  shoulders: 'SHOULDERS',
  'upper arms': 'UPPER_ARMS',
  'lower arms': 'LOWER_ARMS',
  neck: 'NECK',
  cardio: 'CARDIO',
};

const EQUIPMENT_MAP: Record<string, Equipment> = {
  'body weight': 'BODY_WEIGHT',
  assisted: 'ASSISTED',
  weighted: 'WEIGHTED',
  barbell: 'BARBELL',
  'olympic barbell': 'OLYMPIC_BARBELL',
  'ez barbell': 'EZ_BARBELL',
  'trap bar': 'TRAP_BAR',
  'smith machine': 'SMITH_MACHINE',
  dumbbell: 'DUMBBELL',
  kettlebell: 'KETTLEBELL',
  cable: 'CABLE',
  'leverage machine': 'LEVERAGE_MACHINE',
  'sled machine': 'SLED_MACHINE',
  band: 'BAND',
  'resistance band': 'RESISTANCE_BAND',
  'medicine ball': 'MEDICINE_BALL',
  'stability ball': 'STABILITY_BALL',
  'bosu ball': 'BOSU_BALL',
  rope: 'ROPE',
  roller: 'ROLLER',
  'wheel roller': 'WHEEL_ROLLER',
  hammer: 'HAMMER',
  tire: 'TIRE',
  'stationary bike': 'STATIONARY_BIKE',
  'elliptical machine': 'ELLIPTICAL_MACHINE',
  'stepmill machine': 'STEPMILL_MACHINE',
  'skierg machine': 'SKIERG_MACHINE',
  'upper body ergometer': 'UPPER_BODY_ERGOMETER',
};

/** Sinónimos de la fuente (en `target` y `secondary_muscles`) → grupo normalizado. */
const MUSCLE_MAP: Record<string, MuscleGroup> = {
  abs: 'ABS',
  abdominals: 'ABS',
  'lower abs': 'ABS',
  obliques: 'OBLIQUES',
  core: 'CORE',
  'hip flexors': 'HIP_FLEXORS',
  'lower back': 'LOWER_BACK',
  spine: 'LOWER_BACK',
  'upper back': 'UPPER_BACK',
  back: 'UPPER_BACK',
  rhomboids: 'UPPER_BACK',
  lats: 'LATS',
  'latissimus dorsi': 'LATS',
  traps: 'TRAPS',
  trapezius: 'TRAPS',
  'levator scapulae': 'NECK',
  sternocleidomastoid: 'NECK',
  pectorals: 'CHEST',
  chest: 'CHEST',
  'upper chest': 'CHEST',
  delts: 'SHOULDERS',
  deltoids: 'SHOULDERS',
  shoulders: 'SHOULDERS',
  'rear deltoids': 'SHOULDERS',
  'rotator cuff': 'SHOULDERS',
  'serratus anterior': 'SERRATUS_ANTERIOR',
  biceps: 'BICEPS',
  brachialis: 'BICEPS',
  triceps: 'TRICEPS',
  forearms: 'FOREARMS',
  wrists: 'FOREARMS',
  'wrist flexors': 'FOREARMS',
  'wrist extensors': 'FOREARMS',
  'grip muscles': 'FOREARMS',
  hands: 'FOREARMS',
  glutes: 'GLUTES',
  quads: 'QUADRICEPS',
  quadriceps: 'QUADRICEPS',
  hamstrings: 'HAMSTRINGS',
  adductors: 'ADDUCTORS',
  'inner thighs': 'ADDUCTORS',
  groin: 'ADDUCTORS',
  abductors: 'ABDUCTORS',
  calves: 'CALVES',
  soleus: 'CALVES',
  ankles: 'ANKLES_AND_FEET',
  'ankle stabilizers': 'ANKLES_AND_FEET',
  feet: 'ANKLES_AND_FEET',
  shins: 'ANKLES_AND_FEET',
  'cardiovascular system': 'CARDIOVASCULAR_SYSTEM',
};

/** Variantes que sólo cambian el ángulo de cámara de la media ("barbell full squat (side pov)"). */
const CAMERA_VARIANT = /\((?:back|side|front) pov\)/i;

/** Reparaciones de codificación observadas en la fuente ("45в°" → "45°"). */
function repairText(text: string): string {
  return text.replace(/в°/g, '°').replace(/\s+/g, ' ').trim();
}

function lookup<T>(map: Record<string, T>, value: string, field: string, id: string): T {
  const mapped = map[value.trim().toLowerCase()];
  if (mapped === undefined) {
    throw new Error(`Valor no mapeado en ${field} del ejercicio ${id}: "${value}"`);
  }
  return mapped;
}

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH - 10)
    .replace(/-+$/g, '');
}

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Transforma la fuente completa. Es determinista: el mismo JSON de entrada produce el mismo
 * catálogo (orden por `sourceId`, slugs estables). Lanza ante cualquier valor sin mapeo para
 * que un cambio de la fuente no se cuele en silencio.
 */
export function transformSource(exercises: readonly SourceExercise[]): CatalogMovement[] {
  const kept = [...exercises]
    .filter((exercise) => !CAMERA_VARIANT.test(exercise.name))
    .sort((a, b) => a.id.localeCompare(b.id));

  const usedSlugs = new Set<string>();
  return kept.map((exercise) => {
    const name = sentenceCase(repairText(exercise.name));
    const baseSlug = slugify(name);
    // Nombres repetidos en la fuente: el segundo y siguientes llevan su id de origen.
    const slug = usedSlugs.has(baseSlug) ? `${baseSlug}-${exercise.id}` : baseSlug;
    usedSlugs.add(slug);

    const category = lookup(CATEGORY_MAP, exercise.body_part, 'body_part', exercise.id);
    const equipment = lookup(EQUIPMENT_MAP, exercise.equipment, 'equipment', exercise.id);
    const primary = lookup(MUSCLE_MAP, exercise.target, 'target', exercise.id);
    const secondary = [
      ...new Set(
        exercise.secondary_muscles.map((muscle) =>
          lookup(MUSCLE_MAP, muscle, 'secondary_muscles', exercise.id),
        ),
      ),
    ].filter((muscle) => muscle !== primary);

    return {
      slug,
      sourceId: exercise.id,
      name,
      category,
      equipment,
      primaryMuscles: [primary],
      secondaryMuscles: secondary,
      instructions: (exercise.instruction_steps.es ?? []).map(repairText).filter(Boolean),
      recordTypes: recordTypesFor({ name, category, equipment }),
    };
  });
}
