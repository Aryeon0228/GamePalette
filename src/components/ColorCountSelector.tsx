"use client"

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
  max = 16,
}: ColorCountSelectorProps) {
  // Keep the value within bounds so persisted/legacy values can't break the UI.
  const clamped = Math.min(max, Math.max(min, value))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Colors</span>
        <span className="text-sm font-semibold tabular-nums">{clamped}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={1}
        value={clamped}
        onValueChange={onChange}
        aria-label="Number of colors to extract"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}
