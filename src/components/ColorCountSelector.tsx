"use client"

import { useEffect, useState } from "react"
import { IoRemoveOutline, IoAddOutline } from "react-icons/io5"
import { Slider } from "@/components/ui/slider"

interface ColorCountSelectorProps {
  value: number
  onChange: (count: number) => void
  min?: number
  max?: number
  /** Render a compact -/+ stepper instead of the full slider (e.g. in a header). */
  compact?: boolean
}

export function ColorCountSelector({
  value,
  onChange,
  min = 3,
  max = 32,
  compact = false,
}: ColorCountSelectorProps) {
  // Keep the value within bounds so persisted/legacy values can't break the UI.
  const clamp = (n: number) => Math.min(max, Math.max(min, n))

  // Track the value locally while dragging so the label updates live, but only
  // propagate to the parent on commit (pointer/key up). This avoids triggering a
  // full re-extraction on every intermediate slider step.
  const [localValue, setLocalValue] = useState(() => clamp(value))

  useEffect(() => {
    setLocalValue(clamp(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  if (compact) {
    const current = clamp(value)
    const step = (delta: number) => {
      const next = clamp(current + delta)
      if (next !== current) onChange(next)
    }
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground mr-1">Colors</span>
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={current <= min}
          aria-label="Decrease color count"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <IoRemoveOutline className="h-4 w-4" />
        </button>
        <span className="w-7 text-center text-sm font-semibold tabular-nums">{current}</span>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={current >= max}
          aria-label="Increase color count"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <IoAddOutline className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Colors</span>
        <span className="text-sm font-semibold tabular-nums">{localValue}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={1}
        value={localValue}
        onValueChange={(next) => setLocalValue(clamp(next))}
        onValueCommit={(next) => onChange(clamp(next))}
        aria-label="Number of colors to extract"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}
