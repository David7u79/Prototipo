import { compareChronologically, type RecordType, type UnitSystem } from '@garfit/domain';
import type { RecordHistoryEntry } from '@garfit/types';
import { formatValue } from '../lib/records';

export type ChartPoint = { x: number; y: number; entry: RecordHistoryEntry };

export function chartPoints(entries: RecordHistoryEntry[]): ChartPoint[] {
  if (entries.length === 0) return [];
  const values = entries.map((entry) => entry.normalizedValue);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  // Calculamos coordenadas x e y normalizadas entre 10 y 90 (eje x) y 10 y 70 (eje y)
  return entries.map((entry, index) => ({
    entry,
    x: entries.length === 1 ? 50 : 10 + (index * 80) / (entries.length - 1),
    y: 10 + ((max - entry.normalizedValue) * 60) / span,
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
  // Aseguramos orden cronológico para trazar la línea y describir la evolución
  const sorted = [...entries].sort(compareChronologically);
  const points = chartPoints(sorted);
  const values = sorted.map((entry) => entry.normalizedValue);
  const first = sorted[0];
  const last = sorted.at(-1);

  if (!first || !last) return null;

  const titleId = `chart-title-${first.id}`;
  const descId = `chart-desc-${first.id}`;
  const description = chartDescription(recordType, sorted, units);

  return (
    <div className="mt-4">
      <svg
        aria-labelledby={`${titleId} ${descId}`}
        className="h-auto w-full"
        role="img"
        viewBox="0 0 100 100"
      >
        <title id={titleId}>Evolución de marcas</title>
        <desc id={descId}>{description}</desc>
        <line stroke="currentColor" strokeWidth="0.5" x1="10" x2="90" y1="70" y2="70" />
        <polyline
          fill="none"
          points={points.map((point) => `${point.x},${point.y}`).join(' ')}
          stroke="currentColor"
          strokeWidth="1"
        />
        {points.map((point) =>
          point.entry.isPersonalBest ? (
            <rect
              fill="currentColor"
              height="4"
              key={point.entry.id}
              width="4"
              x={point.x - 2}
              y={point.y - 2}
            />
          ) : (
            <circle cx={point.x} cy={point.y} fill="currentColor" key={point.entry.id} r="1.5" />
          ),
        )}
        <text fontSize="4" x="0" y="12">
          {formatValue(recordType, Math.max(...values), units)}
        </text>
        <text fontSize="4" x="0" y="72">
          {formatValue(recordType, Math.min(...values), units)}
        </text>
        {sorted.length === 1 ? (
          <text fontSize="4" textAnchor="middle" x="50" y="82">
            {first.performedAt}
          </text>
        ) : (
          <>
            <text fontSize="4" x="10" y="82">
              {first.performedAt}
            </text>
            <text fontSize="4" textAnchor="end" x="90" y="82">
              {last.performedAt}
            </text>
          </>
        )}
      </svg>
      {sorted.length === 1 && (
        <p className="text-sm text-muted">Registra otra marca para ver tu evolución.</p>
      )}
    </div>
  );
}
