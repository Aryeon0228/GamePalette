"use client"

import { useState, useMemo } from "react"
import { Color, VariationStyle } from "@/types"
import { generateColorVariations, getVariationInfo } from "@/lib/styleFilters"
import { copyToClipboard, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Check, Copy } from "lucide-react"

interface ColorVariationsProps {
  color: Color
  className?: string
  compact?: boolean
}

export function ColorVariations({ color, className, compact = false }: ColorVariationsProps) {
  const [style, setStyle] = useState<VariationStyle>("stylized")
  const [copiedHex, setCopiedHex] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const variations = useMemo(
    () => generateColorVariations(color, style),
    [color, style]
  )

  const info = useMemo(
    () => getVariationInfo(variations, style),
    [variations, style]
  )

  const handleCopy = async (hex: string) => {
    await copyToClipboard(hex)
    setCopiedHex(hex)
    setTimeout(() => setCopiedHex(null), 1500)
  }

  const variationSteps = [
    { key: "shadow2", color: variations.shadow2, label: "S2", fullLabel: "Shadow 2", delta: -30 },
    { key: "shadow1", color: variations.shadow1, label: "S1", fullLabel: "Shadow 1", delta: -15 },
    { key: "midtone", color: variations.midtone, label: "Base", fullLabel: "Base", delta: 0 },
    { key: "highlight1", color: variations.highlight1, label: "L1", fullLabel: "Light 1", delta: 15 },
    { key: "highlight2", color: variations.highlight2, label: "L2", fullLabel: "Light 2", delta: 30 },
  ]

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header with Style Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Value Variations</h3>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              style === "stylized"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent hover:bg-muted"
            )}
            onClick={() => setStyle("stylized")}
          >
            Stylized
          </button>
          <button
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              style === "realistic"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent hover:bg-muted"
            )}
            onClick={() => setStyle("realistic")}
          >
            Realistic
          </button>
        </div>
      </div>

      {/* Color Strip - Main Visual */}
      <div className="rounded-lg overflow-hidden border border-border">
        <div className="flex h-16">
          {variationSteps.map((step) => (
            <div
              key={step.key}
              className={cn(
                "flex-1 relative group cursor-pointer transition-transform",
                step.key === "midtone" && "ring-2 ring-primary ring-inset"
              )}
              style={{ backgroundColor: step.color.hex }}
              onClick={() => handleCopy(step.color.hex)}
            >
              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                {copiedHex === step.color.hex ? (
                  <Check className="h-4 w-4 text-white" />
                ) : (
                  <Copy className="h-3 w-3 text-white" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Compact Labels */}
        <div className="flex bg-card/80 border-t border-border text-[10px]">
          {variationSteps.map((step) => {
            const hueDiff = step.color.hsl.h - color.hsl.h
            const normalizedDiff = hueDiff > 180 ? hueDiff - 360 : hueDiff < -180 ? hueDiff + 360 : hueDiff

            return (
              <div
                key={step.key}
                className={cn(
                  "flex-1 py-1.5 px-1 text-center border-r border-border last:border-r-0",
                  step.key === "midtone" && "bg-primary/10"
                )}
              >
                <p className="font-medium text-foreground">{step.color.hex}</p>
                <p className="text-muted-foreground">
                  L:{step.color.hsl.l}%
                  {style === "stylized" && step.key !== "midtone" && normalizedDiff !== 0 && (
                    <span className={cn(
                      "ml-1",
                      normalizedDiff > 0 ? "text-blue-400" : "text-orange-400"
                    )}>
                      H:{normalizedDiff > 0 ? "+" : ""}{normalizedDiff}°
                    </span>
                  )}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Info Text */}
      <p className="text-xs text-muted-foreground">
        {style === "stylized" ? (
          <>Shadows shift to cool (+Hue), Highlights shift to warm (-Hue)</>
        ) : (
          <>Pure lightness changes only, no hue shifting</>
        )}
      </p>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => {
            const allHex = variationSteps.map((s) => s.color.hex).join(", ")
            copyToClipboard(allHex)
            setCopiedHex("all")
            setTimeout(() => setCopiedHex(null), 1500)
          }}
        >
          {copiedHex === "all" ? (
            <>
              <Check className="h-3 w-3 mr-1.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1.5" />
              Copy All
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? "Hide" : "Details"}
        </Button>
      </div>

      {/* Detailed Table (Collapsible) */}
      {showDetails && (
        <div className="rounded-lg border border-border overflow-hidden text-xs">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-2 py-1.5 text-left font-medium">Step</th>
                <th className="px-2 py-1.5 text-left font-medium">L%</th>
                <th className="px-2 py-1.5 text-left font-medium">H°</th>
                <th className="px-2 py-1.5 text-left font-medium">ΔH</th>
              </tr>
            </thead>
            <tbody>
              {variationSteps.map((step) => {
                const hueDiff = step.color.hsl.h - color.hsl.h
                const normalizedDiff = hueDiff > 180 ? hueDiff - 360 : hueDiff < -180 ? hueDiff + 360 : hueDiff

                return (
                  <tr
                    key={step.key}
                    className={cn(
                      "border-t border-border",
                      step.key === "midtone" && "bg-primary/5"
                    )}
                  >
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: step.color.hex }}
                        />
                        <span>{step.fullLabel}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 font-mono">
                      {step.color.hsl.l}
                      <span className="text-muted-foreground text-[10px] ml-0.5">
                        ({step.delta >= 0 ? "+" : ""}{step.delta})
                      </span>
                    </td>
                    <td className="px-2 py-1.5 font-mono">{step.color.hsl.h}</td>
                    <td className="px-2 py-1.5 font-mono">
                      {step.key === "midtone" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className={cn(
                          normalizedDiff > 0 ? "text-blue-400" : normalizedDiff < 0 ? "text-orange-400" : ""
                        )}>
                          {normalizedDiff > 0 ? "+" : ""}{normalizedDiff}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
