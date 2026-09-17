import { describe, expect, it } from 'vitest';
import { dateLabel, initialSets, parseRepScheme } from './workouts';

describe('entrenamientos', () => {
  it('convierte el esquema de repeticiones', () => {
    expect(parseRepScheme('21-15-9')).toEqual([21, 15, 9]);
    expect(parseRepScheme('21-x')).toBeNull();
  });

  it('prellena series desde la prescripción', () => {
    expect(
      initialSets({
        targetSets: 2,
        targetReps: 5,
        targetLoadValue: 100,
        targetLoadUnit: 'KILOGRAM',
        targetDistanceValue: null,
        targetDistanceUnit: null,
        targetDurationSeconds: null,
      }),
    ).toHaveLength(2);
  });

  it('agrupa fechas relativas', () => {
    expect(dateLabel('2026-09-16', new Date('2026-09-16T12:00:00Z'))).toBe('Hoy');
  });
});
