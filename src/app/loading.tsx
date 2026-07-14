export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Chargement">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-slate-200/80" />
        <div className="h-4 w-72 max-w-full rounded bg-slate-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl border border-slate-100 bg-white/70" />
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-slate-100 bg-white/70" />
    </div>
  );
}
