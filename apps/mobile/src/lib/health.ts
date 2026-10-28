import {
  aggregateBiometrics,
  pickMatchingSession,
  type BiometricHeartRateSample,
} from '@garfit/domain';
import type { WorkoutBiometricsInput } from '@garfit/validation';
import { Platform } from 'react-native';
import {
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
  type Permission,
} from 'react-native-health-connect';

export type HealthAvailability = 'available' | 'needs-update' | 'unavailable';

const REQUIRED_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
];

/**
 * Comprueba la disponibilidad de Health Connect.
 * En iOS o web devuelve 'unavailable' directamente sin invocar el módulo nativo.
 */
export async function healthAvailability(): Promise<HealthAvailability> {
  if (Platform.OS !== 'android') {
    return 'unavailable';
  }

  try {
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_AVAILABLE) {
      return 'available';
    }
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
      return 'needs-update';
    }
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/**
 * Pide y asegura que los permisos de lectura requeridos estén concedidos.
 * Devuelve boolean indicando si los tres permisos fueron concedidos.
 */
export async function ensureReadPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const initialized = await initialize();
    if (!initialized) {
      return false;
    }

    const granted = await getGrantedPermissions();
    const hasAll = REQUIRED_PERMISSIONS.every((req) =>
      granted.some(
        (g) =>
          'accessType' in g &&
          'recordType' in g &&
          g.accessType === req.accessType &&
          g.recordType === req.recordType,
      ),
    );

    if (hasAll) {
      return true;
    }

    const result = await requestPermission(REQUIRED_PERMISSIONS);
    return REQUIRED_PERMISSIONS.every((req) =>
      result.some(
        (g) =>
          'accessType' in g &&
          'recordType' in g &&
          g.accessType === req.accessType &&
          g.recordType === req.recordType,
      ),
    );
  } catch {
    return false;
  }
}

/**
 * Lee datos biométricos de Health Connect en la ventana del entrenamiento.
 *
 * 1. Lee ExerciseSession en la ventana ±15 min y elige con pickMatchingSession.
 *    Si no hay sesión, usa la ventana del entrenamiento.
 * 2. Lee HeartRate (aplanando samples) y ActiveCaloriesBurned (energy.inKilocalories) en esa ventana.
 * 3. Agrega con aggregateBiometrics.
 * 4. Devuelve null si avgHeartRateBpm, maxHeartRateBpm y activeCaloriesKcal son null.
 */
export async function readWorkoutBiometrics(
  workoutStart: string,
  workoutEnd: string,
): Promise<WorkoutBiometricsInput | null> {
  if (Platform.OS !== 'android') {
    return null;
  }

  const hasPermissions = await ensureReadPermissions();
  if (!hasPermissions) {
    return null;
  }

  const marginMs = 15 * 60 * 1000;
  const searchStartTime = new Date(new Date(workoutStart).getTime() - marginMs).toISOString();
  const searchEndTime = new Date(new Date(workoutEnd).getTime() + marginMs).toISOString();

  // 1. Sesiones de ejercicio en ventana ±15 min
  let targetStart = workoutStart;
  let targetEnd = workoutEnd;
  let externalId: string | null = null;

  try {
    const sessionRecords = await readRecords('ExerciseSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: searchStartTime,
        endTime: searchEndTime,
      },
    });

    const candidateSessions = sessionRecords.records.map((r) => ({
      id: r.metadata?.id ?? '',
      startTime: r.startTime,
      endTime: r.endTime,
    }));

    const matchedSession = pickMatchingSession(
      candidateSessions,
      workoutStart,
      workoutEnd,
      15,
    );

    if (matchedSession) {
      targetStart = matchedSession.startTime;
      targetEnd = matchedSession.endTime;
      externalId = matchedSession.id || null;
    }
  } catch {
    // Si falla la lectura de sesiones, se continúa con la ventana original del entrenamiento
  }

  // 2. HeartRate y ActiveCaloriesBurned en [targetStart, targetEnd]
  const heartRateSamples: BiometricHeartRateSample[] = [];
  try {
    const hrRecords = await readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: targetStart,
        endTime: targetEnd,
      },
    });

    for (const record of hrRecords.records) {
      if (Array.isArray(record.samples)) {
        for (const sample of record.samples) {
          if (sample && typeof sample.beatsPerMinute === 'number') {
            heartRateSamples.push({ beatsPerMinute: sample.beatsPerMinute });
          }
        }
      }
    }
  } catch {
    // Continuar si falla
  }

  const activeCaloriesKcal: number[] = [];
  try {
    const calRecords = await readRecords('ActiveCaloriesBurned', {
      timeRangeFilter: {
        operator: 'between',
        startTime: targetStart,
        endTime: targetEnd,
      },
    });

    for (const record of calRecords.records) {
      const kcal = record.energy?.inKilocalories;
      if (typeof kcal === 'number' && !Number.isNaN(kcal)) {
        activeCaloriesKcal.push(kcal);
      }
    }
  } catch {
    // Continuar si falla
  }

  // 3. Agregación
  const aggregated = aggregateBiometrics(heartRateSamples, activeCaloriesKcal);

  if (
    aggregated.avgHeartRateBpm === null &&
    aggregated.maxHeartRateBpm === null &&
    aggregated.activeCaloriesKcal === null
  ) {
    return null;
  }

  return {
    avgHeartRateBpm: aggregated.avgHeartRateBpm,
    maxHeartRateBpm: aggregated.maxHeartRateBpm,
    activeCaloriesKcal: aggregated.activeCaloriesKcal,
    startedAt: targetStart,
    endedAt: targetEnd,
    source: 'HEALTH_CONNECT',
    externalId,
  };
}
