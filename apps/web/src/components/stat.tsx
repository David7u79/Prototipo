type StatProps = {
  label: string;
  value: string | number;
  unit?: string;
  change?: string | null;
  previous?: string | number | null;
  hint?: string;
  className?: string;
};

export function Stat({
  label,
  value,
  unit,
  change,
  previous,
  hint,
  className = '',
}: StatProps) {
  const isPositive = change?.startsWith('+');
  const isNegative = change?.startsWith('-');

  return (
    <article
      className={`rounded-2xl border border-line bg-surface p-5 transition hover:border-line/80 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</h3>
        {change && (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
              isPositive
                ? 'border border-success/30 bg-success/15 text-success'
                : isNegative
                  ? 'border border-danger/30 bg-danger/15 text-danger'
                  : 'border border-line bg-raised text-muted'
            }`}
          >
            {change}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold tracking-tight text-ink tabular-nums">{value}</span>
        {unit && <span className="text-sm font-medium text-muted">{unit}</span>}
      </div>
      {previous !== undefined && previous !== null && (
        <p className="mt-2 text-xs text-muted">
          Anterior: <span className="font-medium text-ink tabular-nums">{previous}</span>
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </article>
  );
}
