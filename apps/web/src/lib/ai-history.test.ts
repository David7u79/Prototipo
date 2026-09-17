import { describe, expect, it } from 'vitest';
import { formatAnalysisHistoryRow } from './ai-history';

describe('formatAnalysisHistoryRow', () => {
  it('muestra tipo, objetivo y fecha legibles', () => {
    expect(
      formatAnalysisHistoryRow({
        id: 'analysis-1',
        type: 'PROGRESS_ANALYSIS',
        status: 'COMPLETED',
        targetId: null,
        targetLabel: null,
        periodDays: 30,
        provider: 'FAKE',
        model: 'fake',
        summary: 'Resumen',
        createdAt: '2026-01-10T12:00:00.000Z',
      }),
    ).toMatchObject({ target: '30 días' });
  });
});
