import { describe, expect, it } from 'vitest';
import { ApiError } from '@garfit/api-client';
import { parseMovementFilters, movementQuery } from './movement-filters';
import { profileFormValues, profileUnitFactors, toProfileMetric } from './profile-units';
import { apiErrorMessage, formatChange, formatValue, recordInputValue } from './records';
import { CHART, chartPoints } from '../components/progress-chart';

describe('parámetros de filtros y paginación', () => {
  it('normaliza filtros válidos y conserva paginación', () => {
    const filters = parseMovementFilters({
      search: ' squat ',
      page: '2',
      equipment: 'BARBELL',
    });
    expect(filters).toMatchObject({ search: 'squat', page: 2, equipment: 'BARBELL' });
    expect(movementQuery(filters, 3)).toContain('page=3');
  });

  it('descarta filtros inválidos sin romper los válidos', () => {
    const filters = parseMovementFilters({
      search: 'bench',
      category: 'INVALID_CATEGORY',
      page: 'not-a-number',
    });
    expect(filters).toMatchObject({ search: 'bench', page: 1, limit: 20 });
    expect(filters.category).toBeUndefined();
  });

  it('construye query strings limpios omitiendo campos vacíos', () => {
    const query = movementQuery({ search: 'deadlift', page: 1 });
    expect(query).toContain('search=deadlift');
    expect(query).toContain('page=1');
  });
});

describe('conversión imperial del perfil deportivo', () => {
  it('convierte medidas imperiales a métricas aplicando redondeo', () => {
    // 100 lb = 45.36 kg redondeado a 2 decimales según el esquema de perfil
    expect(toProfileMetric('100', 'IMPERIAL', profileUnitFactors.kg, 2)).toBe(45.36);

    // 70 pulgadas = 177.8 cm redondeado a 1 decimal
    expect(toProfileMetric('70', 'IMPERIAL', profileUnitFactors.cm, 1)).toBe(177.8);
  });

  it('conserva valores métricos sin alteración de factor', () => {
    expect(toProfileMetric('82.5', 'METRIC', profileUnitFactors.kg, 2)).toBe(82.5);
    expect(toProfileMetric('', 'METRIC', profileUnitFactors.kg)).toBeNull();
    expect(toProfileMetric(null, 'IMPERIAL', profileUnitFactors.kg)).toBeNull();
  });

  it('redondea valores mostrados en el formulario al pasar a imperial', () => {
    const values = profileFormValues({ heightCm: 177.8, weightKg: 45.36 }, 'IMPERIAL');
    expect(values.height).toBe(70);
    expect(values.weight).toBe(100);
  });
});

describe('escala y puntos de gráfica SVG', () => {
  it('construye puntos de gráfica con una escala estable', () => {
    const entries = [
      { id: 'a', normalizedValue: 90 },
      { id: 'b', normalizedValue: 105 },
    ] as never;
    const points = chartPoints(entries);
    const { left, right, top, bottom } = CHART.plot;
    expect(points.map((p) => p.x)).toEqual([left, right]);
    expect(points[0].y).toBe(bottom); // menor valor queda abajo
    expect(points[1].y).toBe(top); // mayor valor queda arriba
  });

  it('centra el punto cuando sólo hay un registro', () => {
    const entries = [{ id: 'single', normalizedValue: 100 }] as never;
    const points = chartPoints(entries);
    const { left, right, top, bottom } = CHART.plot;
    expect(points).toHaveLength(1);
    expect(points[0].x).toBe((left + right) / 2);
    expect(points[0].y).toBe((top + bottom) / 2);
  });

  it('el lienzo es apaisado para no crecer en alto al ocupar todo el ancho', () => {
    expect(CHART.width / CHART.height).toBeGreaterThanOrEqual(2);
  });

  it('maneja un array vacío de entradas sin error', () => {
    expect(chartPoints([])).toEqual([]);
  });
});

describe('formato y captura de marcas', () => {
  it('formatea marcas y cambios con signo explícito', () => {
    expect(formatValue('WEIGHT', 100, 'METRIC')).toBe('100 kg');
    expect(formatChange('WEIGHT', 5, 'METRIC')).toBe('+5 kg');
    expect(formatChange('WEIGHT', -2.5, 'METRIC')).toBe('-2.5 kg');
    expect(formatChange('TIME', -10, 'METRIC')).toBe('-0:10');
  });

  it('interpreta valores de duración y valores numéricos', () => {
    expect(recordInputValue('TIME', '05:30')).toBe(330);
    expect(recordInputValue('WEIGHT', '100')).toBe(100);
    expect(recordInputValue('WEIGHT', 'abc')).toBeNull();
  });

  it('mapea errores conocidos de la API a español', () => {
    const makeError = (code: string) =>
      new ApiError(400, { statusCode: 400, code, message: 'fail' });

    expect(apiErrorMessage(makeError('MOVEMENT_NOT_FOUND'))).toBe('No encontramos ese movimiento.');
    expect(apiErrorMessage(makeError('RECORD_TYPE_NOT_ALLOWED'))).toBe(
      'Ese tipo de marca no está permitido para este movimiento.',
    );
    expect(apiErrorMessage(makeError('VALIDATION_FAILED'))).toBe('Revisa los datos indicados.');
    expect(apiErrorMessage(new Error('desconocido'))).toBe(
      'No fue posible completar la operación.',
    );
  });
});
