import type { AiAnalysisSummary } from '@garfit/types';
import { AI_ANALYSIS_TYPE_LABELS } from '@garfit/validation';

export function formatAnalysisHistoryRow(analysis: AiAnalysisSummary) {
  const date = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(analysis.createdAt));
  const target = analysis.targetLabel ?? `${analysis.periodDays ?? 30} días`;

  return { date, target, type: AI_ANALYSIS_TYPE_LABELS[analysis.type] };
}
