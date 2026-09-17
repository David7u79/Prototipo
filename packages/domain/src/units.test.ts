import { describe, expect, it } from 'vitest';
import {
  displayUnitFor,
  formatDuration,
  formatRecordValue,
  fromCanonical,
  isUnitAllowed,
  parseDuration,
  toCanonical,
} from './units.js';

describe('toCanonical y fromCanonical', () => {
  it('convierte libras a kg con la definición internacional y 3 decimales', () => {
    expect(toCanonical(225, 'POUND')).toBe(102.058);
    expect(toCanonical(1, 'POUND')).toBe(0.454);
  });

  it('convierte kilómetros y millas a metros', () => {
    expect(toCanonical(5.25, 'KILOMETER')).toBe(5250);
    expect(toCanonical(1, 'MILE')).toBe(1609.344);
  });

  it('deja igual las unidades canónicas', () => {
    expect(toCanonical(100.5, 'KILOGRAM')).toBe(100.5);
    expect(toCanonical(18, 'REPETITION')).toBe(18);
    expect(toCanonical(95, 'SECOND')).toBe(95);
  });

  it('vuelve de canónico a la unidad pedida', () => {
    expect(fromCanonical(100, 'POUND')).toBeCloseTo(220.462, 3);
    expect(fromCanonical(1609.344, 'MILE')).toBe(1);
  });
});

describe('isUnitAllowed', () => {
  it('acepta sólo las unidades de cada tipo', () => {
    expect(isUnitAllowed('WEIGHT', 'POUND')).toBe(true);
    expect(isUnitAllowed('WEIGHT', 'SECOND')).toBe(false);
    expect(isUnitAllowed('DISTANCE', 'MILE')).toBe(true);
    expect(isUnitAllowed('REPS', 'KILOGRAM')).toBe(false);
    expect(isUnitAllowed('TIME', 'SECOND')).toBe(true);
  });
});

describe('displayUnitFor', () => {
  it('elige kg o lb según el sistema del atleta', () => {
    expect(displayUnitFor('WEIGHT', 'METRIC')).toBe('KILOGRAM');
    expect(displayUnitFor('WEIGHT', 'IMPERIAL')).toBe('POUND');
  });

  it('muestra distancias cortas en metros y largas en km, o millas en imperial', () => {
    expect(displayUnitFor('DISTANCE', 'METRIC', 800)).toBe('METER');
    expect(displayUnitFor('DISTANCE', 'METRIC', 1000)).toBe('KILOMETER');
    expect(displayUnitFor('DISTANCE', 'IMPERIAL', 800)).toBe('MILE');
  });

  it('usa la unidad canónica en repeticiones y tiempos', () => {
    expect(displayUnitFor('REPS', 'IMPERIAL')).toBe('REPETITION');
    expect(displayUnitFor('DURATION', 'IMPERIAL')).toBe('SECOND');
  });
});

describe('formatRecordValue', () => {
  it('formatea peso con un decimal como máximo', () => {
    expect(formatRecordValue('WEIGHT', 102.5)).toBe('102.5 kg');
    expect(formatRecordValue('WEIGHT', 102.058, 'POUND')).toBe('225 lb');
  });

  it('formatea repeticiones, distancias y tiempos', () => {
    expect(formatRecordValue('REPS', 18)).toBe('18 reps');
    expect(formatRecordValue('DISTANCE', 5250, 'KILOMETER')).toBe('5.25 km');
    expect(formatRecordValue('DISTANCE', 5000, 'MILE')).toBe('3.11 mi');
    expect(formatRecordValue('TIME', 1500)).toBe('25:00');
    expect(formatRecordValue('DURATION', 95)).toBe('1:35');
  });
});

describe('formatDuration y parseDuration', () => {
  it('formatea segundos como m:ss o h:mm:ss', () => {
    expect(formatDuration(59)).toBe('0:59');
    expect(formatDuration(95)).toBe('1:35');
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3725)).toBe('1:02:05');
  });

  it('interpreta ss, mm:ss y hh:mm:ss', () => {
    expect(parseDuration('45')).toBe(45);
    expect(parseDuration('1:35')).toBe(95);
    expect(parseDuration(' 1:02:05 ')).toBe(3725);
  });

  it('rechaza textos inválidos', () => {
    for (const text of ['1:60', 'a:10', '1:2:3:4', '', '1:-5', '1.5']) {
      expect(parseDuration(text), text).toBeNull();
    }
  });
});
