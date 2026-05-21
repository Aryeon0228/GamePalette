"use client"

import { useEffect, useState } from "react"
import { Slider } from "@/components/ui/slider"

interface ColorCountSelectorProps {
  value: number
  onChange: (count: number) => void
  min?: number
  max?: number
}

export function ColorCountSelector({
  value,
  onChange,
  min = 3,
  max = 32,
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
