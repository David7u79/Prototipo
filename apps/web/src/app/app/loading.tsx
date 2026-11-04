export default function AppLoading() {
  return (
    <div
      role="status"
      aria-label="Cargando contenido..."
      className="mx-auto max-w-5xl space-y-6 animate-pulse"
    >
      <div className="h-8 w-48 rounded-[10px] bg-raised" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-28 rounded-2xl border border-line bg-surface" />
        <div className="h-28 rounded-2xl border border-line bg-surface" />
        <div className="h-28 rounded-2xl border border-line bg-surface" />
        <div className="h-28 rounded-2xl border border-line bg-surface" />
      </div>
      <div className="h-64 rounded-2xl border border-line bg-surface" />
      <span className="sr-only">Cargando...</span>
    </div>
  );
}
