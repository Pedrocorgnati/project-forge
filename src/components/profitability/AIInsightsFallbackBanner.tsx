// ─── AI INSIGHTS FALLBACK BANNER ─────────────────────────────────────────────
// module-15-rentabilia-dashboard / TASK-7 / ST002
// Banner de fallback quando insights de IA estão indisponíveis no painel de rentabilidade.
// Renomeado de DegradedBanner para evitar colisão com src/components/ui/degraded-banner.tsx

import { cn } from '@/lib/utils'

interface AIInsightsFallbackBannerProps {
  message?: string
  className?: string
}

export function AIInsightsFallbackBanner({
  message = 'Insights de IA temporariamente indisponíveis. O dashboard continua funcional.',
  className,
}: AIInsightsFallbackBannerProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3',
        'border-amber-200 bg-amber-50 text-amber-800',
        'dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200',
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  )
}
