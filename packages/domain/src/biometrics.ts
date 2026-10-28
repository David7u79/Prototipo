/**
 * Funciones puras para procesar y agregar datos biométricos de smartwatches (Health Connect / Wear OS).
 *
 * Sin dependencias de UI ni librerías nativas.
 */

export interface BiometricSession {
  id: string;
  startTime: string;
  endTime: string;
}

export interface BiometricHeartRateSample {
  beatsPerMinute: number;
}

export interface AggregatedBiometrics {
  avgHeartRateBpm: number | null;
  maxHeartRateBpm: number | null;
  activeCaloriesKcal: number | null;
}

/**
 * Selecciona la sesión de ejercicio con mayor solape temporal respecto a la ventana del entrenamiento
 * expandida por el margen en minutos (por defecto 15 minutos).
 *
 * Si ninguna sesión solapa con la ventana expandida o la lista está vacía, devuelve `null`.
 */
export function pickMatchingSession<T extends BiometricSession>(
  sessions: T[],
  workoutStart: string,
  workoutEnd: string,
  marginMinutes = 15,
): T | null {
  if (sessions.length === 0) return null;

  const marginMs = marginMinutes * 60 * 1000;
  const windowStart = new Date(workoutStart).getTime() - marginMs;
  const windowEnd = new Date(workoutEnd).getTime() + marginMs;

  if (windowEnd <= windowStart) return null;

  let bestSession: T | null = null;
  let maxOverlap = 0;

  for (const session of sessions) {
    const sStart = new Date(session.startTime).getTime();
    const sEnd = new Date(session.endTime).getTime();

    const overlapStart = Math.max(windowStart, sStart);
    const overlapEnd = Math.min(windowEnd, sEnd);
    const overlap = overlapEnd - overlapStart;

    if (overlap > maxOverlap) {
      maxOverlap = overlap;
      bestSession = session;
    }
  }

  return maxOverlap > 0 ? bestSession : null;
}

/**
 * Agrega muestras de frecuencia cardíaca y calorías activas.
 *
 * Reglas:
 * - Muestras de frecuencia cardíaca fuera de 30–250 lpm se descartan.
 * - FC media y máxima redondeadas al entero más cercano (`Math.round`).
 * - Sin muestras válidas de FC -> `avgHeartRateBpm` y `maxHeartRateBpm` son `null`.
 * - Calorías activas = suma de los valores, redondeada a entero.
 * - Sin valores de calorías (array vacío) -> `activeCaloriesKcal` es `null`.
 */
export function aggregateBiometrics(
  heartRateSamples: BiometricHeartRateSample[],
  activeCaloriesKcal: number[],
): AggregatedBiometrics {
  const validSamples = heartRateSamples
    .map((s) => s.beatsPerMinute)
    .filter((bpm) => typeof bpm === 'number' && !Number.isNaN(bpm) && bpm >= 30 && bpm <= 250);

  let avgHeartRateBpm: number | null = null;
  let maxHeartRateBpm: number | null = null;

  if (validSamples.length > 0) {
    const sum = validSamples.reduce((acc, bpm) => acc + bpm, 0);
    avgHeartRateBpm = Math.round(sum / validSamples.length);
    maxHeartRateBpm = Math.round(Math.max(...validSamples));
  }

  let totalCalories: number | null = null;
  const validCalories = activeCaloriesKcal.filter(
    (kcal) => typeof kcal === 'number' && !Number.isNaN(kcal),
  );

  if (validCalories.length > 0) {
    const sumCalories = validCalories.reduce((acc, kcal) => acc + kcal, 0);
    totalCalories = Math.round(sumCalories);
  }

  return {
    avgHeartRateBpm,
    maxHeartRateBpm,
    activeCaloriesKcal: totalCalories,
  };
}
