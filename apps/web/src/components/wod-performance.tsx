import type { WodPerformanceComparison } from '@garfit/domain';
import { unavailableReasonText } from '@/lib/comparisons';

function changeLabel(performance: WodPerformanceComparison) {
  if (!performance.change) return null;
  const sign = performance.change.absolute > 0 ? '+' : '';
  const value = `${sign}${performance.change.absolute} ${performance.unit}`;
  const percent = performance.change.percent === null ? '' : ` (${performance.change.percent}%)`;
  return `${value}${percent}`;
}

export function WodPerformance({ performance }: { performance: WodPerformanceComparison }) {
  if (!performance.comparisonAvailable) {
    return (
      <p className="mt-2 text-sm text-muted">
        {unavailableReasonText(performance.unavailableReason)}
      </p>
    );
  }

  const history = performance.history;
  const max = Math.max(...history.map((attempt) => attempt.value), 1);
  const points = history.map((attempt, index) => {
    const x = history.length === 1 ? 160 : 20 + (index * 280) / (history.length - 1);
    return `${x},${120 - (attempt.value / max) * 90}`;
  });

  return (
    <section className="mt-8 rounded-2xl border border-line bg-panel p-5">
      <h2 className="text-xl font-bold">Tu rendimiento</h2>
      {performance.attempts === 0 ? (
        <p className="mt-2 text-sm text-muted">Aún no hay resultados comparables.</p>
      ) : (
        <>
          <dl className="mt-4 grid gap-3 sm:grid-cols-4">
            <Result label="Mejor" value={performance.best?.display} />
            <Result label="Último" value={performance.latest?.display} />
            <Result label="Anterior" value={performance.previous?.display} />
            <Result label="Cambio" value={changeLabel(performance)} />
          </dl>
          {history.length > 1 && (
            <svg
              aria-label="Evolución de resultados del WOD"
              className="mt-5 h-auto w-full text-brand"
              role="img"
              viewBox="0 0 320 140"
            >
              <title>Evolución de resultados del WOD</title>
              <line
                stroke="currentColor"
                strokeDasharray="4 4"
                x1="20"
                x2="300"
                y1="120"
                y2="120"
              />
              <polyline
                fill="none"
                points={points.join(' ')}
                stroke="currentColor"
                strokeWidth="3"
              />
              {history.map((attempt, index) => {
                const [x, y] = points[index].split(',');
                return <circle cx={x} cy={y} fill="currentColor" key={attempt.workoutId} r="4" />;
              })}
            </svg>
          )}
          <ul className="mt-4 space-y-1 text-sm">
            {history.map((attempt) => (
              <li key={attempt.workoutId}>
                {attempt.performedOn} · {attempt.display}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Result({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-semibold">{value ?? 'Sin dato'}</dd>
    </div>
  );
}
