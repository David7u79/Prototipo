export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-4" role="status" aria-label="Cargando movimientos">
      <div className="h-10 w-56 rounded-[10px] bg-raised" />
      <div className="h-32 rounded-2xl border border-line bg-surface" />
      <div className="h-24 rounded-2xl border border-line bg-surface" />
      <span className="sr-only">Cargando movimientos...</span>
    </div>
  );
}
