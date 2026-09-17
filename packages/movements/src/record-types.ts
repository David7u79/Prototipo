import type { RecordType } from '@garfit/domain';
import type { Equipment, MovementCategory } from './taxonomy.js';

/** Equipamiento que añade una carga externa medible: admite marcas de peso. */
const LOADED_EQUIPMENT: ReadonlySet<Equipment> = new Set<Equipment>([
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
  'MEDICINE_BALL',
]);

/** Máquinas de cardio: admiten distancia y tiempo aunque la fuente no las clasifique como cardio. */
const CARDIO_EQUIPMENT: ReadonlySet<Equipment> = new Set<Equipment>([
  'STATIONARY_BIKE',
  'ELLIPTICAL_MACHINE',
  'STEPMILL_MACHINE',
  'SKIERG_MACHINE',
  'UPPER_BODY_ERGOMETER',
  'ROWING_MACHINE',
]);

/** Movimientos isométricos por nombre: su marca natural es cuánto tiempo se sostienen. */
const ISOMETRIC_NAME = /\b(plank|hold|hang|wall sit|l-sit|bridge)\b/i;

/**
 * Tipos de marca que tiene sentido registrar para un movimiento. Reglas explícitas y
 * deterministas (ver ADR 0007):
 * 1. Cardio (por categoría o máquina): repeticiones, distancia, duración y tiempo.
 * 2. Carga externa: peso y repeticiones.
 * 3. Resto (peso corporal, bandas, balones…): repeticiones.
 * 4. Isométricos por nombre (plank, hold, hang…): además, duración.
 */
export function recordTypesFor(movement: {
  name: string;
  category: MovementCategory;
  equipment: Equipment;
}): RecordType[] {
  if (movement.category === 'CARDIO' || CARDIO_EQUIPMENT.has(movement.equipment)) {
    return ['REPS', 'DISTANCE', 'DURATION', 'TIME'];
  }
  const types: RecordType[] = LOADED_EQUIPMENT.has(movement.equipment)
    ? ['WEIGHT', 'REPS']
    : ['REPS'];
  if (ISOMETRIC_NAME.test(movement.name)) types.push('DURATION');
  return types;
}
