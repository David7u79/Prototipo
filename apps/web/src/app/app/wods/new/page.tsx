import type { Metadata } from 'next';
import Link from 'next/link';
import { WodBuilder } from '@/components/wod-builder';

export const metadata: Metadata = {
  title: 'Nuevo WOD',
};

export default function NewWodPage() {
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <Link className="text-sm font-semibold text-accent hover:underline" href="/app/wods">
        ← Volver a WODs
      </Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Creador</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">Nuevo WOD</h1>
      </div>
      <WodBuilder />
    </section>
  );
}
