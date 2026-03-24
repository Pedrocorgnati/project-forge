import { cn } from '@/lib/utils'

interface RangeDisplayProps {
  min: number
  max: number
  label?: string
  /** Unit suffix displayed in labels (default: 'h') */
  unit?: string
  /** Show min/midpoint/max labels below the bar (default: true) */
  showLabels?: boolean
  className?: string
}

function getRangeColor(spread: number): string {
  // spread = (max - min) / max * 100
  if (spread < 25) return 'var(--confidence-high)'   // verde — baixo risco
  if (spread < 50) return 'var(--confidence-medium)' // âmbar — risco médio
  return 'var(--confidence-low)'                     // vermelho — alto risco
}

export function RangeDisplay({ min, max, label, unit = 'h', showLabels = true, className }: RangeDisplayProps) {
  if (max === 0) return null

  const spreadPct = Math.round(((max - min) / max) * 100)
  const minPct = Math.round((min / max) * 100)
  const midpoint = Math.round((min + max) / 2)
  const midPct = Math.round((midpoint / max) * 100)
  const fillColor = getRangeColor(spreadPct)

  const ariaLabel =
    label
      ? `${label}: mínimo ${min}${unit}, máximo ${max}${unit}, amplitude ${spreadPct}%`
      : `Intervalo: mínimo ${min}${unit}, máximo ${max}${unit}`

  return (
    <div className={cn('space-y-1', className)}>
      <div
        role="img"
        aria-label={ariaLabel}
        className="relative h-3 rounded-full overflow-hidden"
        style={{ background: 'var(--range-bar-bg)' }}
      >
        {/* fill segment: from min% to 100% */}
        <div
          className="absolute top-0 h-full rounded-full"
          style={{
            left: `${minPct}%`,
            width: `${100 - minPct}%`,
            background: fillColor,
            opacity: 0.9,
          }}
          aria-hidden="true"
        />
        {/* midpoint marker */}
        <div
          className="absolute top-0 h-full w-0.5 rounded-full"
          style={{
            left: `${midPct}%`,
            background: 'var(--range-midpoint)',
          }}
          aria-hidden="true"
        />
      </div>
      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{min}{unit}</span>
          <span className="text-[10px] opacity-60">{midpoint}{unit}</span>
          <span>{max}{unit}</span>
        </div>
      )}
    </div>
  )
}
