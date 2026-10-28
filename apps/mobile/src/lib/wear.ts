import { pickMatchingSession } from '@garfit/domain';
import type { WorkoutBiometricsInput } from '@garfit/validation';
import { Platform } from 'react-native';
import {
  deleteSummary,
  getSummaries,
  isWearNativeModuleAvailable,
} from '../../modules/garfit-wear';

/**
 * Comprueba si el puente con Wear OS está disponible en la plataforma actual
 * (sólo Android y módulo nativo presente).
 */
export function wearBridgeAvailable(): boolean {
  return Platform.OS === 'android' && isWearNativeModuleAvailable();
}

/**
 * Lee los resúmenes de entrenamiento sincronizados desde la app de Wear OS,
 * los empareja con la ventana del entrenamiento actual mediante pickMatchingSession (±15 min),
 * y devuelve el objeto para biometría con source 'WEAR_OS'.
 * Devuelve null si no hay coincidencia o si las tres métricas son null.
 */
export async function readWearBiometrics(
  workoutStart: string,
  workoutEnd: string,
): Promise<WorkoutBiometricsInput | null> {
  if (!wearBridgeAvailable()) {
    return null;
  }

  const summaries = await getSummaries();
  if (summaries.length === 0) {
    return null;
  }

  const candidateSessions = summaries.map((s) => ({
    ...s,
    id: s.sessionId,
    startTime: s.startedAt,
    endTime: s.endedAt,
  }));

  const matched = pickMatchingSession(candidateSessions, workoutStart, workoutEnd, 15);
  if (!matched) {
    return null;
  }

  if (
    matched.avgHeartRateBpm === null &&
    matched.maxHeartRateBpm === null &&
    matched.activeCaloriesKcal === null
  ) {
    return null;
  }

  return {
    avgHeartRateBpm: matched.avgHeartRateBpm,
    maxHeartRateBpm: matched.maxHeartRateBpm,
    activeCaloriesKcal: matched.activeCaloriesKcal,
    startedAt: matched.startedAt,
    endedAt: matched.endedAt,
    source: 'WEAR_OS',
    externalId: matched.sessionId,
  };
}

/**
 * Borra el resumen sincronizado de una sesión en el Data Layer del reloj.
 */
export async function forgetWearSummary(sessionId: string): Promise<void> {
  try {
    await deleteSummary(sessionId);
  } catch {
    // Si falla, no propagar error
  }
}
