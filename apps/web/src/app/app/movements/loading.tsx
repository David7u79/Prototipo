export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-4" aria-label="Cargando movimientos">
      <div className="h-10 w-56 rounded bg-slate-200" />
      <div className="h-32 rounded-2xl bg-slate-200" />
      <div className="h-24 rounded-2xl bg-slate-200" />
    </div>
  );
}
