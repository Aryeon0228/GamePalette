"use client"

interface ColorChannelBarProps {
  label: string
  value: number
  max: number
  /** Fill color of the bar. */
  color: string
  /** When true, the track shows a hue gradient with a marker (used for the H channel). */
  hueTrack?: boolean
  /** When true, the bar is centered at zero and fills toward the (signed) value. */
  bipolar?: boolean
  /** Optional unit suffix shown after the value (e.g. "%" or "°"). */
  unit?: string
  /** Pre-formatted display string; overrides value + unit. */
  display?: string
}

const HUE_GRADIENT =
  "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"

export function ColorChannelBar({
  label,
  value,
  max,
  color,
  hueTrack,
  bipolar,
  unit = "",
  display,
}: ColorChannelBarProps) {
  // Unipolar: 0..100 from the left. Bipolar: signed half-width from the center.
  const ratio = Math.max(-1, Math.min(1, value / max))
  const percentage = Math.max(0, Math.min(100, ratio * 100))
  const half = (Math.abs(ratio) * 100) / 2

  return (
    <div className="flex items-center gap-3">
      <span className="w-5 text-xs font-semibold text-muted-foreground">{label}</span>
      <div
        className="relative flex-1 h-2 rounded-full overflow-hidden bg-muted"
        style={hueTrack ? { backgroundImage: HUE_GRADIENT } : undefined}
      >
        {hueTrack ? (
          <div
            className="absolute inset-y-0 w-1 -translate-x-1/2 rounded-full bg-foreground ring-1 ring-background transition-[left] duration-300 ease-out"
            style={{ left: `${percentage}%` }}
          />
        ) : bipolar ? (
          <div
            className="absolute inset-y-0 rounded-full transition-all duration-300 ease-out"
            style={{
              backgroundColor: color,
              left: ratio >= 0 ? "50%" : `${50 - half}%`,
              width: `${half}%`,
            }}
          />
        ) : (
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-300 ease-out"
            style={{ width: `${percentage}%`, backgroundColor: color }}
          />
        )}
      </div>
      <span className="w-12 text-right text-xs font-mono text-muted-foreground tabular-nums">
        {display ?? `${value}${unit}`}
      </span>
    </div>
  )
}
