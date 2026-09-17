import { describe, expect, it } from 'vitest';
import { formatPeriodChange, unavailableReasonText } from './comparisons';

describe('formatters de comparaciones', () => {
  it('explica cada razón no comparable', () => {
    expect(unavailableReasonText('SCORE_NO_COMPARABLE')).toMatch(/puntuación comparable/i);
    expect(unavailableReasonText('ESQUEMA_DESCONOCIDO')).toMatch(/esquema/i);
    expect(unavailableReasonText('TIPO_NO_SOPORTADO')).toMatch(/todavía/i);
  });

  it('describe un porcentaje no disponible', () => {
    expect(formatPeriodChange({ absolute: 2, percent: null })).toBe('+2 (sin porcentaje anterior)');
  });
});
