import Link from 'next/link';
import { WodBuilder } from '@/components/wod-builder';
export default function NewWodPage() {
  return (
    <section className="mx-auto max-w-3xl">
      <Link className="underline" href="/app/wods">
        Volver a WODs
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Nuevo WOD</h1>
      <WodBuilder />
    </section>
  );
}
