import type { AiAnalysisItem, AiAnalysisResponse, AiEvidenceFact } from '@garfit/types';
import { AI_ANALYSIS_TYPE_LABELS } from '@garfit/validation';

export function formatEvidenceFact(fact: AiEvidenceFact) {
  return [
    fact.label,
    `${fact.value}${fact.unit ? ` ${fact.unit}` : ''}`,
    fact.occurredAt ? formatDate(fact.occurredAt) : '',
  ]
    .filter(Boolean)
    .join(' — ');
}
export function analysisGeneratedLabel(cached: boolean, provider: string | null) {
  return cached ? 'Análisis anterior' : `Generado con ${provider ?? 'GarFit'}`;
}

function formatDate(value: string) {
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' }).format(date);
}

export function AiAnalysis({ analysis }: { analysis: AiAnalysisResponse }) {
  const insufficient = analysis.status === 'INSUFFICIENT_DATA';
  return (
    <article className="mt-8 rounded-2xl border border-line bg-panel p-5">
      <h2 className="text-xl font-bold">{AI_ANALYSIS_TYPE_LABELS[analysis.type]}</h2>
      <p className="mt-1 text-sm text-muted">
        {analysisGeneratedLabel(analysis.cached, analysis.provider)} ·{' '}
        {formatDate(analysis.generatedAt)}
      </p>
      <AnalysisSection title="Resumen">
        <p>{analysis.summary}</p>
      </AnalysisSection>
      {insufficient ? (
        <AnalysisList title="Datos que faltan" values={analysis.missingData} />
      ) : (
        <>
          <AnalysisItems title="Observaciones" items={analysis.observations ?? []} />
          <AnalysisItems title="Sugerencias" items={analysis.suggestions ?? []} />
          <AnalysisSection title="Evidencia">
            <p className="text-muted">La evidencia se muestra en cada observación o sugerencia.</p>
          </AnalysisSection>
          <AnalysisList
            title="Datos utilizados"
            values={(analysis.dataUsed ?? []).map((item) => `${item.label}: ${item.value}`)}
          />
          <AnalysisList title="Limitaciones" values={analysis.limitations ?? []} />
        </>
      )}
    </article>
  );
}
function AnalysisSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </section>
  );
}
function AnalysisList({ title, values }: { title: string; values: string[] }) {
  if (!values.length) {
    return null;
  }

  return (
    <AnalysisSection title={title}>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {values.map((value, i) => (
          <li key={`${value}-${i}`}>{value}</li>
        ))}
      </ul>
    </AnalysisSection>
  );
}

function AnalysisItems({ title, items }: { title: string; items: AiAnalysisItem[] }) {
  if (!items.length) {
    return null;
  }

  const singular = title === 'Observaciones' ? 'Observación' : title.slice(0, -1);

  return (
    <AnalysisSection title={title}>
      <div className="mt-2 space-y-3">
        {items.map((item, i) => (
          <article
            aria-label={`${singular}: ${item.title}`}
            className="rounded border border-line p-3"
            key={`${item.title}-${i}`}
          >
            <h4 className="font-medium">{item.title}</h4>
            <p>{item.description}</p>
            {item.evidence?.length ? (
              <details className="mt-2">
                <summary>Evidencia</summary>
                <ul className="mt-2 list-disc pl-5">
                  {item.evidence.map((fact) => (
                    <li aria-label={`Hecho: ${fact.label}`} key={fact.id}>
                      {formatEvidenceFact(fact)}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </article>
        ))}
      </div>
    </AnalysisSection>
  );
}
