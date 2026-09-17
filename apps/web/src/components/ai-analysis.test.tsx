import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AiAnalysis, analysisGeneratedLabel, formatEvidenceFact } from './ai-analysis';

describe('formatEvidenceFact', () => {
  it('incluye unidad y fecha cuando existen', () => {
    expect(
      formatEvidenceFact({
        id: '1',
        category: 'PERSONAL_RECORD',
        label: 'Back Squat 5RM',
        value: '105',
        unit: 'kg',
        occurredAt: '2026-09-17',
      }),
    ).toMatch(/Back Squat 5RM — 105 kg — 17-sep/i);
  });
  it('funciona sin unidad ni fecha', () => {
    expect(
      formatEvidenceFact({ id: '2', category: 'WORKOUT', label: 'Sesiones', value: '4' }),
    ).toBe('Sesiones — 4');
  });
});

describe('AiAnalysis', () => {
  it('muestra los datos faltantes cuando el análisis no tiene datos suficientes', () => {
    const markup = renderToStaticMarkup(
      <AiAnalysis
        analysis={{
          id: null,
          type: 'PROGRESS_ANALYSIS',
          status: 'INSUFFICIENT_DATA',
          cached: false,
          provider: null,
          model: null,
          promptVersion: null,
          generatedAt: '2026-09-17',
          periodDays: 30,
          summary: 'Aún no hay datos suficientes para analizar tu progreso.',
          observations: [],
          suggestions: [],
          limitations: [],
          missingData: ['Completa al menos un entrenamiento de fuerza.'],
          dataUsed: [],
        }}
      />,
    );

    expect(markup).toContain('Datos que faltan');
    expect(markup).toContain('Completa al menos un entrenamiento de fuerza.');
  });

  it('formatea correctamente fechas ISO con marca de tiempo', () => {
    const markup = renderToStaticMarkup(
      <AiAnalysis
        analysis={{
          id: 'test-id',
          type: 'WOD_EXPLANATION',
          status: 'COMPLETED',
          cached: false,
          provider: 'FAKE',
          model: 'fake',
          promptVersion: '1.0',
          generatedAt: '2026-09-17T18:52:25.123Z',
          periodDays: null,
          summary: 'Explicación del WOD',
          observations: [],
          suggestions: [],
          limitations: [],
          missingData: [],
          dataUsed: [],
        }}
      />,
    );

    expect(markup).toContain('Explicación del WOD');
    expect(markup).toMatch(/17-sep|17 sept/i);
  });
});

it('identifica un resultado recuperado de caché', () => {
  expect(analysisGeneratedLabel(true, 'GEMINI')).toBe('Análisis anterior');
});
