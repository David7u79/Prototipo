/**
 * Taxonomía del catálogo de movimientos. Los valores responden a los datos reales de la fuente
 * (hasaneyldrm/exercises-dataset): la categoría es la región corporal que la fuente asigna,
 * no una disciplina deportiva inventada.
 */

export const MOVEMENT_CATEGORIES = [
  'WAIST',
  'UPPER_LEGS',
  'LOWER_LEGS',
  'BACK',
  'CHEST',
  'SHOULDERS',
  'UPPER_ARMS',
  'LOWER_ARMS',
  'NECK',
  'CARDIO',
] as const;
export type MovementCategory = (typeof MOVEMENT_CATEGORIES)[number];

export const EQUIPMENT = [
  'BODY_WEIGHT',
  'ASSISTED',
  'WEIGHTED',
  'BARBELL',
  'OLYMPIC_BARBELL',
  'EZ_BARBELL',
  'TRAP_BAR',
  'SMITH_MACHINE',
  'DUMBBELL',
  'KETTLEBELL',
  'CABLE',
  'LEVERAGE_MACHINE',
  'SLED_MACHINE',
  'BAND',
  'RESISTANCE_BAND',
  'MEDICINE_BALL',
  'STABILITY_BALL',
  'BOSU_BALL',
  'ROPE',
  'ROLLER',
  'WHEEL_ROLLER',
  'HAMMER',
  'TIRE',
  'STATIONARY_BIKE',
  'ELLIPTICAL_MACHINE',
  'STEPMILL_MACHINE',
  'SKIERG_MACHINE',
  'UPPER_BODY_ERGOMETER',
  /** Añadido por GarFit para movimientos curados (la fuente no incluye remo ergómetro). */
  'ROWING_MACHINE',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

/**
 * Grupos musculares normalizados. La fuente usa sinónimos ("quads"/"quadriceps",
 * "delts"/"deltoids"…); `muscleFromSource` los unifica. No describe beneficios fisiológicos:
 * sólo qué zona trabaja el movimiento según la fuente.
 */
export const MUSCLE_GROUPS = [
  'ABS',
  'OBLIQUES',
  'CORE',
  'HIP_FLEXORS',
  'LOWER_BACK',
  'UPPER_BACK',
  'LATS',
  'TRAPS',
  'NECK',
  'CHEST',
  'SHOULDERS',
  'SERRATUS_ANTERIOR',
  'BICEPS',
  'TRICEPS',
  'FOREARMS',
  'GLUTES',
  'QUADRICEPS',
  'HAMSTRINGS',
  'ADDUCTORS',
  'ABDUCTORS',
  'CALVES',
  'ANKLES_AND_FEET',
  'CARDIOVASCULAR_SYSTEM',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/**
 * Dificultad. La fuente actual no la clasifica, así que los movimientos importados la tienen en
 * `null`; el enum existe para movimientos que se clasifiquen de forma documentada.
 */
export const MOVEMENT_DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export type MovementDifficulty = (typeof MOVEMENT_DIFFICULTIES)[number];

export const MOVEMENT_CATEGORY_LABELS: Record<MovementCategory, string> = {
  WAIST: 'Abdomen y cintura',
  UPPER_LEGS: 'Piernas (muslos y cadera)',
  LOWER_LEGS: 'Piernas (pantorrillas)',
  BACK: 'Espalda',
  CHEST: 'Pecho',
  SHOULDERS: 'Hombros',
  UPPER_ARMS: 'Brazos',
  LOWER_ARMS: 'Antebrazos',
  NECK: 'Cuello',
  CARDIO: 'Cardio',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  BODY_WEIGHT: 'Peso corporal',
  ASSISTED: 'Asistido',
  WEIGHTED: 'Con lastre',
  BARBELL: 'Barra',
  OLYMPIC_BARBELL: 'Barra olímpica',
  EZ_BARBELL: 'Barra Z',
  TRAP_BAR: 'Barra hexagonal',
  SMITH_MACHINE: 'Máquina Smith',
  DUMBBELL: 'Mancuerna',
  KETTLEBELL: 'Pesa rusa',
  CABLE: 'Polea',
  LEVERAGE_MACHINE: 'Máquina de palanca',
  SLED_MACHINE: 'Prensa / trineo',
  BAND: 'Banda',
  RESISTANCE_BAND: 'Banda de resistencia',
  MEDICINE_BALL: 'Balón medicinal',
  STABILITY_BALL: 'Pelota de estabilidad',
  BOSU_BALL: 'Bosu',
  ROPE: 'Cuerda',
  ROLLER: 'Rodillo',
  WHEEL_ROLLER: 'Rueda abdominal',
  HAMMER: 'Mazo',
  TIRE: 'Neumático',
  STATIONARY_BIKE: 'Bicicleta estática',
  ELLIPTICAL_MACHINE: 'Elíptica',
  STEPMILL_MACHINE: 'Escaladora',
  SKIERG_MACHINE: 'SkiErg',
  UPPER_BODY_ERGOMETER: 'Ergómetro de brazos',
  ROWING_MACHINE: 'Remo ergómetro',
};

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  ABS: 'Abdominales',
  OBLIQUES: 'Oblicuos',
  CORE: 'Core',
  HIP_FLEXORS: 'Flexores de cadera',
  LOWER_BACK: 'Zona lumbar',
  UPPER_BACK: 'Espalda alta',
  LATS: 'Dorsales',
  TRAPS: 'Trapecios',
  NECK: 'Cuello',
  CHEST: 'Pecho',
  SHOULDERS: 'Hombros',
  SERRATUS_ANTERIOR: 'Serrato anterior',
  BICEPS: 'Bíceps',
  TRICEPS: 'Tríceps',
  FOREARMS: 'Antebrazos',
  GLUTES: 'Glúteos',
  QUADRICEPS: 'Cuádriceps',
  HAMSTRINGS: 'Isquiotibiales',
  ADDUCTORS: 'Aductores',
  ABDUCTORS: 'Abductores',
  CALVES: 'Pantorrillas',
  ANKLES_AND_FEET: 'Tobillos y pies',
  CARDIOVASCULAR_SYSTEM: 'Sistema cardiovascular',
};

export const MOVEMENT_DIFFICULTY_LABELS: Record<MovementDifficulty, string> = {
  BEGINNER: 'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
};
