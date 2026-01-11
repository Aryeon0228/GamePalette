"use client"

import { useState } from "react"
import { Color } from "@/types"
import { ColorCard } from "./ColorCard"
import { cn } from "@/lib/utils"

interface PaletteDisplayProps {
  colors: Color[]
  className?: string
  onColorSelect?: (color: Color, index: number) => void
  selectedIndex?: number
  compact?: boolean
}

export function PaletteDisplay({
  colors,
  className,
  onColorSelect,
  selectedIndex,
  compact = false,
}: PaletteDisplayProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (colors.length === 0) {
    return (
      <div className={cn(
        "flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8",
        className
      )}>
        <p className="text-muted-foreground text-center">
          Upload an image to extract colors
        </p>
      </div>
    )
  }

  if (compact) {
    return (
      <div className={cn("flex rounded-lg overflow-hidden", className)}>
        {colors.map((color, index) => (
          <div
            key={index}
            className={cn(
              "flex-1 h-12 cursor-pointer transition-transform hover:scale-y-110",
              selectedIndex === index && "ring-2 ring-primary"
            )}
            style={{ backgroundColor: color.hex }}
            onClick={() => onColorSelect?.(color, index)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            title={color.hex}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn(
      "grid gap-3",
      colors.length <= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3 sm:grid-cols-5 lg:grid-cols-6",
      className
    )}>
      {colors.map((color, index) => (
        <ColorCard
          key={index}
          color={color}
          selected={selectedIndex === index}
          onClick={() => onColorSelect?.(color, index)}
        />
      ))}
    </div>
  )
}

// Simple inline palette display for library view
export function PalettePreview({ colors, className }: { colors: Color[], className?: string }) {
  return (
    <div className={cn("flex h-8 rounded overflow-hidden", className)}>
      {colors.map((color, index) => (
        <div
          key={index}
          className="flex-1"
          style={{ backgroundColor: color.hex }}
        />
      ))}
    </div>
  )
}
