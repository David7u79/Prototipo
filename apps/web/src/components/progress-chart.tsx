import { compareChronologically, type RecordType, type UnitSystem } from '@garfit/domain';
import type { RecordHistoryEntry } from '@garfit/types';
import { formatValue } from '../lib/records';

/**
 * Geometría de la gráfica en unidades del viewBox. El lienzo es apaisado (640×240) para que, al
 * escalar a todo el ancho, la gráfica no crezca en alto sin límite; el área de trazado deja
 * margen a la izquierda para las etiquetas del eje Y y abajo para las fechas.
 */
export const CHART = {
  width: 640,
  height: 240,
  plot: { left: 96, right: 616, top: 24, bottom: 184 },
} as const;

export type ChartPoint = { x: number; y: number; entry: RecordHistoryEntry };

export function chartPoints(entries: RecordHistoryEntry[]): ChartPoint[] {
  if (entries.length === 0) return [];
  const { left, right, top, bottom } = CHART.plot;
  const values = entries.map((entry) => entry.normalizedValue);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  return entries.map((entry, index) => ({
    entry,
    // Un solo registro (o todos iguales) se centra; si no, se reparte a lo ancho en orden.
    x:
      entries.length === 1
        ? (left + right) / 2
        : left + (index * (right - left)) / (entries.length - 1),
    y:
      span === 0
        ? (top + bottom) / 2
        : top + ((max - entry.normalizedValue) * (bottom - top)) / span,
  }));
}

function chartDescription(
  recordType: RecordType,
  sorted: RecordHistoryEntry[],
  units: UnitSystem,
): string {
  const first = sorted[0];
  const last = sorted.at(-1);
  if (!first || !last) return '';

  const timeNote = recordType === 'TIME' ? ' Menor tiempo es mejor.' : '';
  const firstVal = formatValue(recordType, first.normalizedValue, units);

  if (sorted.length === 1) {
    return `Registro de ${firstVal} en ${first.performedAt}; 1 registro.${timeNote}`;
  }

  const lastVal = formatValue(recordType, last.normalizedValue, units);
  return (
    `Evolución de ${firstVal} a ${lastVal} entre ` +
    `${first.performedAt} y ${last.performedAt}; ${sorted.length} registros.${timeNote}`
  );
}

export function ProgressChart({
  entries,
  recordType,
  units,
}: {
  entries: RecordHistoryEntry[];
  recordType: RecordType;
  units: UnitSystem;
}) {
  // Orden cronológico para trazar la línea y describir la evolución.
  const sorted = [...entries].sort(compareChronologically);
  const points = chartPoints(sorted);
  const values = sorted.map((entry) => entry.normalizedValue);
  const first = sorted[0];
  const last = sorted.at(-1);

  if (!first || !last) return null;

  const { left, right, top, bottom } = CHART.plot;
  const titleId = `chart-title-${first.id}`;
  const descId = `chart-desc-${first.id}`;
  const description = chartDescription(recordType, sorted, units);
  const dateY = bottom + 32;

  return (
    <div className="mt-4 max-w-3xl">
      <svg
        aria-labelledby={`${titleId} ${descId}`}
        className="h-auto w-full text-brand"
        role="img"
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      >
        <title id={titleId}>Evolución de marcas</title>
        <desc id={descId}>{description}</desc>
        <g className="text-slate-300" stroke="currentColor" strokeWidth="1">
          <line x1={left} x2={right} y1={top} y2={top} strokeDasharray="4 4" />
          <line x1={left} x2={right} y1={bottom} y2={bottom} />
        </g>
        <polyline
          fill="none"
          points={points.map((point) => `${point.x},${point.y}`).join(' ')}
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        {points.map((point) =>
          // Las mejores marcas se distinguen por forma (cuadrado), no sólo por color.
          point.entry.isPersonalBest ? (
            <rect
              fill="currentColor"
              height="12"
              key={point.entry.id}
              width="12"
              x={point.x - 6}
              y={point.y - 6}
            />
          ) : (
            <circle cx={point.x} cy={point.y} fill="currentColor" key={point.entry.id} r="5" />
          ),
        )}
        <g className="fill-slate-600 text-[13px]" fontSize="13">
          <text textAnchor="end" x={left - 12} y={top + 4}>
            {formatValue(recordType, Math.max(...values), units)}
          </text>
          <text textAnchor="end" x={left - 12} y={bottom + 4}>
            {formatValue(recordType, Math.min(...values), units)}
          </text>
          {sorted.length === 1 ? (
            <text textAnchor="middle" x={(left + right) / 2} y={dateY}>
              {first.performedAt}
            </text>
          ) : (
            <>
              <text x={left} y={dateY}>
                {first.performedAt}
              </text>
              <text textAnchor="end" x={right} y={dateY}>
                {last.performedAt}
              </text>
            </>
          )}
        </g>
      </svg>
      {sorted.length === 1 && (
        <p className="text-sm text-muted">Registra otra marca para ver tu evolución.</p>
      )}
    </div>
  );
}
