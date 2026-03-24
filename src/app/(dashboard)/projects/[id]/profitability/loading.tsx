// ─── PROFITABILITY LOADING (dashboard group) ─────────────────────────────────
// module-15-rentabilia-dashboard / TASK-6
// Skeleton de carregamento para a página de rentabilidade

export default function ProfitabilityLoading() {
  return (
    <div
      className="space-y-6 p-4 md:p-6"
      role="status"
      aria-busy="true"
      aria-label="Carregando dashboard de rentabilidade..."
    >
      <span className="sr-only">Carregando...</span>

      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div
          className="h-7 w-40 animate-pulse bg-slate-200 dark:bg-slate-700 rounded"
          aria-hidden="true"
        />
        <div
          className="h-9 w-48 animate-pulse bg-slate-200 dark:bg-slate-700 rounded"
          aria-hidden="true"
        />
      </div>

      {/* Cards + Gauge skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              aria-hidden="true"
              className="h-28 animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
          ))}
        </div>
        <div
          aria-hidden="true"
          className="h-40 animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg"
        />
      </div>

      {/* Chart skeleton */}
      <div
        aria-hidden="true"
        className="h-64 animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg"
      />

      {/* Table skeleton */}
      <div
        aria-hidden="true"
        className="h-48 animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg"
      />
    </div>
  )
}
