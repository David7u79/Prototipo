import Link from 'next/link';
import { AiAnalysis } from '@/components/ai-analysis';
import { AiHistoryActions } from '@/components/ai-history-actions';
import { serverApi } from '@/lib/auth';

export default async function SavedAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await serverApi().ai.analyses.get(id);

  return (
    <section className="mx-auto max-w-4xl">
      <Link className="underline" href="/app/ai">
        Volver al asistente IA
      </Link>
      <AiAnalysis analysis={analysis} saved />
      <AiHistoryActions id={id} />
    </section>
  );
}
