"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Color } from "@/types"
import { ColorCard } from "./ColorCard"
import { cn } from "@/lib/utils"

interface PaletteDisplayProps {
  colors: Color[]
  className?: string
  onColorSelect?: (color: Color, index: number) => void
  selectedIndex?: number
  compact?: boolean
  /** Keep a fixed-height container and shrink swatches as the count grows. */
  adaptive?: boolean
}

export function PaletteDisplay({
  colors,
  className,
  onColorSelect,
  selectedIndex,
  compact = false,
  adaptive = false,
}: PaletteDisplayProps) {
  const t = useTranslations("paletteDisplay")
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (colors.length === 0) {
    return (
      <div className={cn(
        "flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8",
        className
      )}>
        <p className="text-muted-foreground text-center">
          {t("uploadHint")}
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

  if (adaptive) {
    // Fixed-height box: pick a column count that keeps the row count low so the
    // container stays the same size and the swatches shrink as colors are added.
    const cols = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(colors.length * 2))))
    return (
      <div
        className={cn("grid gap-2 h-72", className)}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridAutoRows: "minmax(0, 1fr)",
        }}
      >
        {colors.map((color, index) => (
          <ColorCard
            key={index}
            color={color}
            fill
            selected={selectedIndex === index}
            onClick={() => onColorSelect?.(color, index)}
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
