import { describe, expect, it } from 'vitest';
import {
  computeChange,
  isBetter,
  lowerIsBetter,
  type RecordEntry,
  seriesKey,
  summarizeAll,
  summarizeSeries,
} from './records.js';

let sequence = 0;

function entry(
  overrides: Partial<RecordEntry> & Pick<RecordEntry, 'normalizedValue'>,
): RecordEntry {
  sequence += 1;
  const performedAt = overrides.performedAt ?? '2026-01-01';
  return {
    id: `r${sequence}`,
    recordType: 'WEIGHT',
    value: overrides.normalizedValue,
    unit: 'KILOGRAM',
    repetitions: 1,
    createdAt: `${performedAt}T10:00:00.000Z`,
    performedAt,
    ...overrides,
    distanceMeters: overrides.distanceMeters ?? null,
  };
}

describe('dirección de mejora', () => {
  it('sólo TIME mejora al bajar', () => {
    expect(lowerIsBetter('TIME')).toBe(true);
    for (const type of ['WEIGHT', 'REPS', 'DISTANCE', 'DURATION'] as const) {
      expect(lowerIsBetter(type)).toBe(false);
    }
    expect(isBetter('WEIGHT', 105, 100)).toBe(true);
    expect(isBetter('TIME', 1500, 1600)).toBe(true);
    expect(isBetter('TIME', 1600, 1500)).toBe(false);
    expect(isBetter('REPS', 10, 10)).toBe(false);
  });
});

describe('seriesKey', () => {
  it('separa cargas por repeticiones y trata null como 1RM', () => {
    expect(seriesKey({ recordType: 'WEIGHT', repetitions: 5 })).toBe('WEIGHT:5');
    expect(seriesKey({ recordType: 'WEIGHT', repetitions: null })).toBe('WEIGHT:1');
    expect(seriesKey({ recordType: 'REPS', repetitions: null })).toBe('REPS');
  });
});

describe('computeChange', () => {
  it('calcula absoluto, porcentaje con un decimal y mejora', () => {
    expect(computeChange('WEIGHT', 90, 105)).toEqual({
      absolute: 15,
      percent: 16.7,
      improved: true,
    });
    expect(computeChange('TIME', 1600, 1500)).toEqual({
      absolute: -100,
      percent: -6.3,
      improved: true,
    });
  });

  it('no calcula porcentaje sobre una base 0', () => {
    expect(computeChange('REPS', 0, 5).percent).toBeNull();
  });
});

describe('summarizeSeries', () => {
  it('ordena por fecha y calcula mejor, actual, cambios y marcas personales', () => {
    const series = summarizeSeries([
      entry({ normalizedValue: 105, performedAt: '2026-05-20' }),
      entry({ normalizedValue: 90, performedAt: '2026-01-10' }),
      entry({ normalizedValue: 100, performedAt: '2026-03-05' }),
    ]);
    expect(series.key).toBe('WEIGHT:1');
    expect(series.count).toBe(3);
    expect(series.first.normalizedValue).toBe(90);
    expect(series.current.normalizedValue).toBe(105);
    expect(series.best.normalizedValue).toBe(105);
    expect(series.changeFromPrevious).toEqual({ absolute: 5, percent: 5, improved: true });
    expect(series.bestImprovement).toEqual({ absolute: 5, percent: 5, improved: true });
    expect(series.totalProgress).toEqual({ absolute: 15, percent: 16.7, improved: true });
    expect(series.history.map((point) => point.isPersonalBest)).toEqual([true, true, true]);
  });

  it('ante empate conserva como mejor marca la primera que lo alcanzó', () => {
    const first = entry({ normalizedValue: 100, performedAt: '2026-01-01' });
    const tie = entry({ normalizedValue: 100, performedAt: '2026-02-01' });
    const series = summarizeSeries([tie, first]);
    expect(series.best.id).toBe(first.id);
    expect(series.history.map((point) => point.isPersonalBest)).toEqual([true, false]);
    expect(series.changeFromPrevious).toEqual({ absolute: 0, percent: 0, improved: false });
  });

  it('refleja una regresión sin perder la mejor marca', () => {
    const series = summarizeSeries([
      entry({ normalizedValue: 110, performedAt: '2026-01-01' }),
      entry({ normalizedValue: 100, performedAt: '2026-02-01' }),
    ]);
    expect(series.best.normalizedValue).toBe(110);
    expect(series.current.normalizedValue).toBe(100);
    expect(series.changeFromPrevious?.improved).toBe(false);
    expect(series.bestImprovement).toBeNull();
    expect(series.totalProgress).toEqual({ absolute: 0, percent: 0, improved: false });
  });

  it('en TIME la mejor marca es el menor tiempo', () => {
    const series = summarizeSeries([
      entry({ recordType: 'TIME', unit: 'SECOND', repetitions: null, normalizedValue: 1600 }),
      entry({
        recordType: 'TIME',
        unit: 'SECOND',
        repetitions: null,
        normalizedValue: 1500,
        performedAt: '2026-02-01',
      }),
    ]);
    expect(series.best.normalizedValue).toBe(1500);
    expect(series.bestImprovement).toEqual({ absolute: -100, percent: -6.3, improved: true });
  });

  it('con un solo registro no hay cambios', () => {
    const series = summarizeSeries([entry({ normalizedValue: 80 })]);
    expect(series.changeFromPrevious).toBeNull();
    expect(series.bestImprovement).toBeNull();
    expect(series.totalProgress).toBeNull();
  });

  it('a igual fecha ordena por momento de registro', () => {
    const later = entry({ normalizedValue: 95, createdAt: '2026-01-01T12:00:00.000Z' });
    const earlier = entry({ normalizedValue: 90, createdAt: '2026-01-01T08:00:00.000Z' });
    const series = summarizeSeries([later, earlier]);
    expect(series.first.id).toBe(earlier.id);
    expect(series.current.id).toBe(later.id);
  });

  it('lanza con una serie vacía o mezclada', () => {
    expect(() => summarizeSeries([])).toThrow();
    expect(() =>
      summarizeSeries([
        entry({ normalizedValue: 100, repetitions: 1 }),
        entry({ normalizedValue: 80, repetitions: 5 }),
      ]),
    ).toThrow();
  });
});

describe('summarizeAll', () => {
  it('agrupa en series separadas por tipo y repeticiones, en orden estable', () => {
    const series = summarizeAll([
      entry({ normalizedValue: 80, repetitions: 5 }),
      entry({ normalizedValue: 100, repetitions: 1 }),
      entry({ recordType: 'REPS', unit: 'REPETITION', repetitions: null, normalizedValue: 12 }),
      entry({ normalizedValue: 110, repetitions: 1, performedAt: '2026-02-01' }),
    ]);
    expect(series.map((item) => [item.key, item.count])).toEqual([
      ['REPS', 1],
      ['WEIGHT:1', 2],
      ['WEIGHT:5', 1],
    ]);
  });
});
