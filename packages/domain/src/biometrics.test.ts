import { describe, expect, it } from 'vitest';
import { aggregateBiometrics, pickMatchingSession } from './biometrics.js';

describe('pickMatchingSession', () => {
  const workoutStart = '2026-05-10T10:00:00.000Z';
  const workoutEnd = '2026-05-10T11:00:00.000Z';

  it('devuelve la sesión con mayor solape', () => {
    const sessions = [
      {
        id: 'session-1',
        startTime: '2026-05-10T10:15:00.000Z',
        endTime: '2026-05-10T10:45:00.000Z', // 30 min solape
      },
      {
        id: 'session-2',
        startTime: '2026-05-10T09:55:00.000Z',
        endTime: '2026-05-10T10:55:00.000Z', // 60 min solape
      },
    ];

    const match = pickMatchingSession(sessions, workoutStart, workoutEnd);
    expect(match?.id).toBe('session-2');
  });

  it('devuelve null si ninguna sesión solapa con la ventana', () => {
    const sessions = [
      {
        id: 'session-early',
        startTime: '2026-05-10T08:00:00.000Z',
        endTime: '2026-05-10T09:00:00.000Z',
      },
      {
        id: 'session-late',
        startTime: '2026-05-10T12:00:00.000Z',
        endTime: '2026-05-10T13:00:00.000Z',
      },
    ];

    expect(pickMatchingSession(sessions, workoutStart, workoutEnd, 15)).toBeNull();
  });

  it('aplica el margen configurable en minutos', () => {
    // Sesión que empieza 10 min antes del workout (09:50) y termina en 09:55.
    // Con margen default (15 min -> ventana empieza 09:45), solapa 5 min.
    // Con margen 0 (ventana empieza 10:00), no solapa.
    const sessions = [
      {
        id: 'session-margin',
        startTime: '2026-05-10T09:50:00.000Z',
        endTime: '2026-05-10T09:55:00.000Z',
      },
    ];

    expect(pickMatchingSession(sessions, workoutStart, workoutEnd, 15)?.id).toBe('session-margin');
    expect(pickMatchingSession(sessions, workoutStart, workoutEnd, 0)).toBeNull();
  });

  it('devuelve null con lista vacía', () => {
    expect(pickMatchingSession([], workoutStart, workoutEnd)).toBeNull();
  });
});

describe('aggregateBiometrics', () => {
  it('descarta muestras fuera del rango 30–250 lpm y calcula avg y max redondeados', () => {
    const samples = [
      { beatsPerMinute: 20 }, // fuera
      { beatsPerMinute: 120 },
      { beatsPerMinute: 145 },
      { beatsPerMinute: 180 },
      { beatsPerMinute: 280 }, // fuera
    ];
    // Válidas: 120, 145, 180 -> sum = 445 -> avg = 445 / 3 = 148.333 -> 148, max = 180
    const res = aggregateBiometrics(samples, []);

    expect(res.avgHeartRateBpm).toBe(148);
    expect(res.maxHeartRateBpm).toBe(180);
    expect(res.activeCaloriesKcal).toBeNull();
  });

  it('devuelve null en FC cuando no hay muestras o todas quedan descartadas', () => {
    expect(aggregateBiometrics([], [])).toEqual({
      avgHeartRateBpm: null,
      maxHeartRateBpm: null,
      activeCaloriesKcal: null,
    });

    expect(
      aggregateBiometrics([{ beatsPerMinute: 10 }, { beatsPerMinute: 260 }], []),
    ).toEqual({
      avgHeartRateBpm: null,
      maxHeartRateBpm: null,
      activeCaloriesKcal: null,
    });
  });

  it('suma las calorías activas y redondea a entero', () => {
    const calories = [120.4, 230.2, 50.9]; // sum = 401.5 -> round = 402
    const res = aggregateBiometrics([], calories);

    expect(res.activeCaloriesKcal).toBe(402);
    expect(res.avgHeartRateBpm).toBeNull();
    expect(res.maxHeartRateBpm).toBeNull();
  });

  it('redondea FC promedio con decimales hacia arriba o abajo según Math.round', () => {
    // 100 y 101 -> avg = 100.5 -> 101
    const res1 = aggregateBiometrics([{ beatsPerMinute: 100 }, { beatsPerMinute: 101 }], []);
    expect(res1.avgHeartRateBpm).toBe(101);

    // 100 y 100 -> avg = 100
    const res2 = aggregateBiometrics([{ beatsPerMinute: 100 }, { beatsPerMinute: 100 }], []);
    expect(res2.avgHeartRateBpm).toBe(100);
  });
});
