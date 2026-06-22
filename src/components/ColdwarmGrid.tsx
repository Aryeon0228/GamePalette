"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { IoSnowOutline, IoFlameOutline, IoCheckmarkOutline } from "react-icons/io5"
import { Color } from "@/types"
import {
  ColdwarmIntensity,
  generateColdwarmGrid,
  hueShiftForIntensity,
} from "@/lib/coldwarm"
import { copyToClipboard, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ColdwarmGridProps {
  color: Color
  className?: string
  /** Half-steps per axis (3 → a 7×7 grid). */
  steps?: number
}

const INTENSITIES: ColdwarmIntensity[] = ["subtle", "normal", "strong"]

export function ColdwarmGrid({ color, className, steps = 4 }: ColdwarmGridProps) {
  const t = useTranslations("coldwarm")
  const [intensity, setIntensity] = useState<ColdwarmIntensity>("normal")
  const [copiedHex, setCopiedHex] = useState<string | null>(null)

  const grid = useMemo(
    () =>
      generateColdwarmGrid(color, {
        steps,
        maxHueShift: hueShiftForIntensity(intensity),
      }),
    [color, intensity, steps]
  )

  const handleCopy = async (hex: string) => {
    await copyToClipboard(hex)
    setCopiedHex(hex)
    setTimeout(() => setCopiedHex(null), 1400)
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header + intensity toggle */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{t("title")}</h3>
          <p className="text-[11px] text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-1.5">
          {INTENSITIES.map((option) => (
            <Button
              key={option}
              size="sm"
              variant={intensity === option ? "default" : "outline"}
              onClick={() => setIntensity(option)}
            >
              {t(option)}
            </Button>
          ))}
        </div>
      </div>

      {/* Axis labels (top): Cold ← → Warm */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
        <span className="flex items-center gap-1 text-sky-400">
          <IoSnowOutline className="h-3.5 w-3.5" />
          {t("cold")}
        </span>
        <span className="flex items-center gap-1 text-orange-400">
          {t("warm")}
          <IoFlameOutline className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="flex gap-2">
        {/* Axis labels (left): Light / Dark */}
        <div className="flex flex-col items-center justify-between text-[10px] text-muted-foreground py-1">
          <span className="[writing-mode:vertical-rl] rotate-180">{t("light")}</span>
          <span className="[writing-mode:vertical-rl] rotate-180">{t("dark")}</span>
        </div>

        {/* The grid */}
        <div
          className="grid flex-1 gap-1"
          style={{ gridTemplateColumns: `repeat(${grid.size}, minmax(0, 1fr))` }}
        >
          {grid.rows.map((row) =>
            row.map((cell) => (
              <button
                key={`${cell.tempStep}:${cell.valueStep}`}
                type="button"
                title={`${cell.color.hex.toUpperCase()} · H${cell.color.hsl.h} S${cell.color.hsl.s} L${cell.color.hsl.l}`}
                className={cn(
                  "group relative aspect-square rounded-sm transition-transform hover:scale-110 hover:z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  cell.isBase
                    ? "ring-2 ring-primary ring-offset-1 ring-offset-card z-10"
                    : "ring-1 ring-inset ring-black/10"
                )}
                style={{ backgroundColor: cell.color.hex }}
                onClick={() => handleCopy(cell.color.hex)}
              >
                {copiedHex === cell.color.hex && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-sm bg-black/40">
                    <IoCheckmarkOutline className="h-3 w-3 text-white" />
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">{t("hint")}</p>
    </div>
  )
}
