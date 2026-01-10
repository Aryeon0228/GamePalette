"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
  max = 8,
}: ColorCountSelectorProps) {
  const counts = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground">Colors:</span>
      <div className="flex space-x-1">
        {counts.map((count) => (
          <Button
            key={count}
            variant={value === count ? "default" : "outline"}
            size="sm"
            className={cn(
              "w-9 h-9 p-0",
              value === count && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
            onClick={() => onChange(count)}
          >
            {count}
          </Button>
        ))}
      </div>
    </div>
  )
}
