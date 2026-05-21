"use client"

interface ColorChannelBarProps {
  label: string
  value: number
  max: number
  /** Fill color of the bar. */
  color: string
  /** When true, the track shows a hue gradient (used for the H channel). */
  hueTrack?: boolean
  /** Optional unit suffix shown after the value (e.g. "%" or "°"). */
  unit?: string
}

const HUE_GRADIENT =
  "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"

export function ColorChannelBar({
  label,
  value,
  max,
  color,
  hueTrack,
  unit = "",
}: ColorChannelBarProps) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100))

  return (
    <div className="flex items-center gap-3">
      <span className="w-5 text-xs font-semibold text-muted-foreground">{label}</span>
      <div
        className="relative flex-1 h-2 rounded-full overflow-hidden bg-muted"
        style={hueTrack ? { backgroundImage: HUE_GRADIENT } : undefined}
      >
        {!hueTrack && (
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${percentage}%`, backgroundColor: color }}
          />
        )}
        {hueTrack && (
          <div
            className="absolute inset-y-0 w-1 -translate-x-1/2 rounded-full bg-foreground ring-1 ring-background"
            style={{ left: `${percentage}%` }}
          />
        )}
      </div>
      <span className="w-12 text-right text-xs font-mono text-muted-foreground tabular-nums">
        {value}
        {unit}
      </span>
    </div>
  )
}
