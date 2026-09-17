import { recordTypesFor } from './record-types.js';
import type { CatalogMovement } from './source-transform.js';
import type { Equipment, MovementCategory, MuscleGroup } from './taxonomy.js';

/**
 * Movimientos curados por GarFit. Cubren huecos reales del catálogo importado que son básicos
 * para registrar entrenamientos (remo ergómetro, air squat, wall ball…) y que la fuente no
 * incluye (se comprobó antes de añadir cada uno; p. ej. "Run" ya existe en la fuente). Las instrucciones son redacción propia del proyecto y se identifican con
 * `source = "garfit"`, separadas de `hasaneyldrm/exercises-dataset`.
 */
export const CURATED_SOURCE = 'garfit';

interface CuratedDefinition {
  slug: string;
  name: string;
  category: MovementCategory;
  equipment: Equipment;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  instructions: string[];
}

const DEFINITIONS: CuratedDefinition[] = [
  {
    slug: 'rowing-ergometer',
    name: 'Rowing ergometer',
    category: 'CARDIO',
    equipment: 'ROWING_MACHINE',
    primaryMuscles: ['CARDIOVASCULAR_SYSTEM'],
    secondaryMuscles: ['QUADRICEPS', 'UPPER_BACK', 'LATS', 'BICEPS'],
    instructions: [
      'Siéntate con los pies sujetos y toma el manubrio con los brazos extendidos.',
      'Empuja primero con las piernas, después inclina el tronco y termina tirando con los brazos.',
      'Regresa en orden inverso: brazos, tronco y piernas.',
    ],
  },
  {
    slug: 'air-squat',
    name: 'Air squat',
    category: 'UPPER_LEGS',
    equipment: 'BODY_WEIGHT',
    primaryMuscles: ['QUADRICEPS'],
    secondaryMuscles: ['GLUTES', 'HAMSTRINGS'],
    instructions: [
      'De pie, con los pies a la anchura de los hombros.',
      'Lleva la cadera atrás y abajo hasta que quede por debajo de las rodillas.',
      'Sube empujando el suelo hasta extender cadera y rodillas.',
    ],
  },
  {
    slug: 'wall-ball',
    name: 'Wall ball',
    category: 'UPPER_LEGS',
    equipment: 'MEDICINE_BALL',
    primaryMuscles: ['QUADRICEPS'],
    secondaryMuscles: ['GLUTES', 'SHOULDERS', 'TRICEPS'],
    instructions: [
      'Sostén el balón medicinal a la altura del pecho frente a una pared.',
      'Haz una sentadilla completa y, al subir, lanza el balón hacia el objetivo marcado.',
      'Recibe el balón y enlaza la siguiente sentadilla.',
    ],
  },
  {
    slug: 'box-jump',
    name: 'Box jump',
    category: 'UPPER_LEGS',
    equipment: 'BODY_WEIGHT',
    primaryMuscles: ['QUADRICEPS'],
    secondaryMuscles: ['GLUTES', 'CALVES'],
    instructions: [
      'Colócate frente al cajón con los pies a la anchura de la cadera.',
      'Salta con ambos pies y aterriza con todo el pie sobre el cajón.',
      'Extiende la cadera arriba y baja con control.',
    ],
  },
  {
    slug: 'double-under',
    name: 'Double under',
    category: 'CARDIO',
    equipment: 'ROPE',
    primaryMuscles: ['CARDIOVASCULAR_SYSTEM'],
    secondaryMuscles: ['CALVES', 'SHOULDERS', 'FOREARMS'],
    instructions: [
      'Salta con los pies juntos y los codos cerca del cuerpo.',
      'Gira la cuerda con las muñecas para que pase dos veces bajo los pies en cada salto.',
    ],
  },
  {
    slug: 'toes-to-bar',
    name: 'Toes to bar',
    category: 'WAIST',
    equipment: 'BODY_WEIGHT',
    primaryMuscles: ['ABS'],
    secondaryMuscles: ['HIP_FLEXORS', 'LATS', 'FOREARMS'],
    instructions: [
      'Cuélgate de la barra con los brazos extendidos.',
      'Lleva los pies hasta tocar la barra activando el abdomen.',
      'Baja las piernas con control antes de la siguiente repetición.',
    ],
  },
  {
    slug: 'barbell-clean-and-jerk',
    name: 'Barbell clean and jerk',
    category: 'UPPER_LEGS',
    equipment: 'BARBELL',
    primaryMuscles: ['GLUTES'],
    secondaryMuscles: ['QUADRICEPS', 'HAMSTRINGS', 'SHOULDERS', 'TRAPS', 'TRICEPS'],
    instructions: [
      'Levanta la barra desde el suelo hasta recibirla sobre los hombros (clean).',
      'Ponte de pie con la barra en posición de rack.',
      'Impulsa con las piernas y bloquea la barra por encima de la cabeza (jerk).',
    ],
  },
];

/** Movimientos curados listos para sembrar; los tipos de marca siguen las reglas comunes. */
export function curatedMovements(): CatalogMovement[] {
  return DEFINITIONS.map((definition) => ({
    ...definition,
    sourceId: definition.slug,
    recordTypes: recordTypesFor(definition),
  }));
}
