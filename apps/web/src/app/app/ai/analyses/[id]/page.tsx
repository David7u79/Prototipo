import type { Metadata } from 'next';
import Link from 'next/link';
import { AiAnalysis } from '@/components/ai-analysis';
import { AiHistoryActions } from '@/components/ai-history-actions';
import { serverApi } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Análisis guardado',
};

export default async function SavedAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await serverApi().ai.analyses.get(id);

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <Link className="text-sm font-semibold text-accent hover:underline" href="/app/ai">
        ← Volver al asistente IA
      </Link>
      <AiAnalysis analysis={analysis} saved />
      <div className="pt-2">
        <AiHistoryActions id={id} />
      </div>
    </section>
  );
}
