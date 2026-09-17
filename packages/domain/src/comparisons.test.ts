import { describe, expect, it } from 'vitest';
import { comparePeriods, compareWodPerformance } from './comparisons.js';
import type { WorkoutScore } from './workouts.js';

const NOW = new Date('2026-07-01T12:00:00.000Z');
const score = {
  timeSeconds: null,
  repsAtTimeCap: null,
  rounds: null,
  extraReps: null,
  completed: null,
};

const intento = (
  workoutId: string,
  performedOn: string,
  resultado: Partial<WorkoutScore>,
  sets: { reps: number | null; loadKg: number | null }[] = [],
) => ({
  workoutId,
  performedOn,
  score: { ...score, ...resultado },
  sets: sets.map((set) => ({ ...set, distanceMeters: null, durationSeconds: null })),
});

const entrenamiento = (
  performedOn: string,
  sets: { reps: number | null; loadKg: number | null }[] = [],
) => ({
  performedOn,
  sets: sets.map((set) => ({ ...set, distanceMeters: null, durationSeconds: null })),
});

describe('comparación de rendimiento de WOD', () => {
  it('conserva una comparación disponible sin ejecuciones FOR_TIME', () => {
    const comparison = compareWodPerformance('FOR_TIME', []);
    expect(comparison.attempts).toBe(0);
    expect(comparison.best).toBeNull();
    expect(comparison.latest).toBeNull();
    expect(comparison.previous).toBeNull();
    expect(comparison.change).toBeNull();
    expect(comparison.comparisonAvailable).toBe(true);
  });

  it('usa la única ejecución FOR_TIME como mejor y última', () => {
    const comparison = compareWodPerformance('FOR_TIME', [
      intento('uno', '2026-06-01', { timeSeconds: 312 }),
    ]);
    expect(comparison.best).toEqual(comparison.latest);
    expect(comparison.previous).toBeNull();
    expect(comparison.change).toBeNull();
  });

  it('calcula la mejora FOR_TIME al reducir 24 segundos', () => {
    const comparison = compareWodPerformance('FOR_TIME', [
      intento('uno', '2026-06-01', { timeSeconds: 312 }),
      intento('dos', '2026-06-02', { timeSeconds: 288 }),
    ]);
    expect(comparison.change).toEqual({ absolute: -24, percent: -7.69, improved: true });
    expect(comparison.lowerIsBetter).toBe(true);
  });

  it('mantiene la mejor histórica cuando la última ejecución FOR_TIME empeora', () => {
    const comparison = compareWodPerformance('FOR_TIME', [
      intento('uno', '2026-06-01', { timeSeconds: 312 }),
      intento('dos', '2026-06-02', { timeSeconds: 288 }),
      intento('tres', '2026-06-03', { timeSeconds: 300 }),
    ]);
    expect(comparison.best?.workoutId).toBe('dos');
    expect(comparison.change).toEqual({ absolute: 12, percent: 4.17, improved: false });
  });

  it('conserva la primera mejor marca ante un empate exacto', () => {
    const comparison = compareWodPerformance('FOR_TIME', [
      intento('primero', '2026-06-01', { timeSeconds: 300 }),
      intento('segundo', '2026-06-02', { timeSeconds: 300 }),
    ]);
    expect(comparison.best?.workoutId).toBe('primero');
    expect(comparison.change).toEqual({ absolute: 0, percent: 0, improved: false });
  });

  it('descarta un FOR_TIME que sólo alcanzó repeticiones al límite', () => {
    const comparison = compareWodPerformance('FOR_TIME', [
      intento('límite', '2026-06-01', { repsAtTimeCap: 120 }),
      intento('completado', '2026-06-02', { timeSeconds: 300 }),
    ]);
    expect(comparison.attempts).toBe(1);
    expect(comparison.history.map((item) => item.workoutId)).toEqual(['completado']);
  });

  it('compara AMRAP por repeticiones totales y conserva su display', () => {
    const comparison = compareWodPerformance(
      'AMRAP',
      [intento('amrap', '2026-06-01', { rounds: 12, extraReps: 3 })],
      { repsPerRound: 10 },
    );
    expect(comparison.best?.value).toBe(123);
    expect(comparison.best?.display).toBe('12 rondas + 3 reps');
    expect(comparison.lowerIsBetter).toBe(false);
  });

  it('declara AMRAP sin esquema como no comparable', () => {
    const comparison = compareWodPerformance('AMRAP', [], { repsPerRound: null });
    expect(comparison.comparisonAvailable).toBe(false);
    expect(comparison.unavailableReason).toBe('ESQUEMA_DESCONOCIDO');
    expect(comparison.history).toEqual([]);
  });

  it('declara los tipos no comparables con su motivo', () => {
    expect(compareWodPerformance('EMOM', []).unavailableReason).toBe('SCORE_NO_COMPARABLE');
    expect(compareWodPerformance('CUSTOM', []).unavailableReason).toBe('TIPO_NO_SOPORTADO');
    expect(compareWodPerformance('CARDIO', []).unavailableReason).toBe('TIPO_NO_SOPORTADO');
  });

  it('compara STRENGTH por volumen y descarta ejecuciones sin volumen', () => {
    const comparison = compareWodPerformance('STRENGTH', [
      intento('sin-volumen', '2026-06-01', {}, [{ reps: 5, loadKg: null }]),
      intento('fuerza', '2026-06-02', {}, [{ reps: 5, loadKg: 100 }]),
    ]);
    expect(comparison.attempts).toBe(1);
    expect(comparison.best).toMatchObject({ workoutId: 'fuerza', value: 500, display: '500 kg' });
    expect(comparison.lowerIsBetter).toBe(false);
  });

  it('ordena el historial de forma determinista aunque cambie el orden de entrada', () => {
    const attempts = [
      intento('dos', '2026-06-02', { timeSeconds: 300 }),
      intento('uno', '2026-06-01', { timeSeconds: 312 }),
      intento('tres', '2026-06-02', { timeSeconds: 288 }),
    ];
    const first = compareWodPerformance('FOR_TIME', attempts);
    const second = compareWodPerformance('FOR_TIME', [...attempts].reverse());
    expect(first.history).toEqual(second.history);
    expect(first.history.map((item) => item.workoutId)).toEqual(['uno', 'dos', 'tres']);
  });
});

describe('comparación entre periodos', () => {
  it('separa las ventanas actual y anterior de 30 días', () => {
    const comparison = comparePeriods(
      [entrenamiento('2026-06-26'), entrenamiento('2026-05-22'), entrenamiento('2026-04-22')],
      [],
      30,
      NOW,
    );
    expect(comparison.current.workouts).toBe(1);
    expect(comparison.previous.workouts).toBe(1);
  });

  it('cuenta los días de entrenamiento distintos', () => {
    const comparison = comparePeriods(
      [entrenamiento('2026-06-26'), entrenamiento('2026-06-26')],
      [],
      30,
      NOW,
    );
    expect(comparison.current.workouts).toBe(2);
    expect(comparison.current.trainingDays).toBe(1);
  });

  it('suma el volumen de las series de cada periodo', () => {
    const comparison = comparePeriods(
      [
        entrenamiento('2026-06-26', [{ reps: 5, loadKg: 100 }]),
        entrenamiento('2026-05-22', [{ reps: 3, loadKg: 100 }]),
      ],
      [],
      30,
      NOW,
    );
    expect(comparison.current.volumeKg).toBe(500);
    expect(comparison.previous.volumeKg).toBe(300);
  });

  it('cuenta sólo las fechas de marcas que caen dentro de cada ventana', () => {
    const comparison = comparePeriods([], ['2026-06-26', '2026-05-22', '2026-04-22'], 30, NOW);
    expect(comparison.current.personalRecords).toBe(1);
    expect(comparison.previous.personalRecords).toBe(1);
  });

  it('devuelve porcentaje nulo ante periodo anterior vacío y lo calcula si existe', () => {
    const withoutPrevious = comparePeriods([entrenamiento('2026-06-26')], [], 30, NOW);
    const withPrevious = comparePeriods(
      [entrenamiento('2026-06-26'), entrenamiento('2026-05-22'), entrenamiento('2026-05-21')],
      [],
      30,
      NOW,
    );
    expect(withoutPrevious.change.workouts.percent).toBeNull();
    expect(withPrevious.change.workouts.percent).toBe(-50);
  });

  it('desplaza las ventanas de la misma forma con 60 y 90 días', () => {
    const workouts = [
      entrenamiento('2026-05-03'),
      entrenamiento('2026-03-04'),
      entrenamiento('2025-12-31'),
    ];
    const sixty = comparePeriods(workouts, [], 60, NOW);
    const ninety = comparePeriods(workouts, [], 90, NOW);
    expect(sixty.current.workouts).toBe(1);
    expect(sixty.previous.workouts).toBe(1);
    expect(ninety.current.workouts).toBe(1);
    expect(ninety.previous.workouts).toBe(1);
  });
});
