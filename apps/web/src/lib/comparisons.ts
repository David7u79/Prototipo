import type { ComparisonUnavailableReason, PeriodMetricChange } from '@garfit/domain';

export function unavailableReasonText(reason: ComparisonUnavailableReason | null) {
  switch (reason) {
    case 'SCORE_NO_COMPARABLE':
      return 'Este tipo de WOD no registra una puntuación comparable.';
    case 'ESQUEMA_DESCONOCIDO':
      return 'No se conoce el esquema necesario para comparar los resultados.';
    case 'TIPO_NO_SOPORTADO':
      return 'Este tipo de WOD todavía no admite comparación de resultados.';
    default:
      return 'No hay una comparación disponible para este WOD.';
  }
}

export function formatPeriodChange(change: PeriodMetricChange) {
  const absolute = `${change.absolute >= 0 ? '+' : ''}${change.absolute}`;
  const percent =
    change.percent === null
      ? 'sin porcentaje anterior'
      : `${change.percent >= 0 ? '+' : ''}${change.percent}%`;
  return `${absolute} (${percent})`;
}
