"use client"

import { useState, useMemo } from "react"
import { Color, ColorVariation, VariationStyle } from "@/types"
import { generateColorVariations, getVariationInfo } from "@/lib/styleFilters"
import { copyToClipboard, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Check, Copy, Info } from "lucide-react"

interface ColorVariationsProps {
  color: Color
  className?: string
}

export function ColorVariations({ color, className }: ColorVariationsProps) {
  const [style, setStyle] = useState<VariationStyle>("stylized")
  const [copiedHex, setCopiedHex] = useState<string | null>(null)

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
    { key: "shadow2", color: variations.shadow2, label: "Shadow 2", delta: "-30" },
    { key: "shadow1", color: variations.shadow1, label: "Shadow 1", delta: "-15" },
    { key: "midtone", color: variations.midtone, label: "Base", delta: "0" },
    { key: "highlight1", color: variations.highlight1, label: "Light 1", delta: "+15" },
    { key: "highlight2", color: variations.highlight2, label: "Light 2", delta: "+30" },
  ]

  return (
    <div className={cn("space-y-4", className)}>
      {/* Style Toggle */}
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

      {/* Info */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">{info.title}</p>
          <p className="text-muted-foreground">{info.description}</p>
        </div>
      </div>

      {/* Color Strip */}
      <div className="rounded-lg overflow-hidden border border-border">
        <div className="flex h-20">
          {variationSteps.map((step) => (
            <div
              key={step.key}
              className="flex-1 relative group cursor-pointer"
              style={{ backgroundColor: step.color.hex }}
              onClick={() => handleCopy(step.color.hex)}
            >
              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                {copiedHex === step.color.hex ? (
                  <Check className="h-5 w-5 text-white" />
                ) : (
                  <Copy className="h-4 w-4 text-white" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Labels */}
        <div className="flex bg-card border-t border-border">
          {variationSteps.map((step) => (
            <div
              key={step.key}
              className="flex-1 p-2 text-center border-r border-border last:border-r-0"
            >
              <p className="text-[10px] text-muted-foreground">{step.label}</p>
              <p className="text-xs font-mono">{step.color.hex}</p>
              {style === "stylized" && step.key !== "midtone" && (
                <p className="text-[10px] text-muted-foreground">
                  H: {step.color.hsl.h}°
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Info Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">Step</th>
              <th className="px-3 py-2 text-left font-medium">L (명도)</th>
              <th className="px-3 py-2 text-left font-medium">H (색상)</th>
              <th className="px-3 py-2 text-left font-medium">Δ Hue</th>
            </tr>
          </thead>
          <tbody>
            {variationSteps.map((step, index) => {
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
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: step.color.hex }}
                      />
                      <span>{step.label}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono">
                    {step.color.hsl.l}%
                    <span className="text-muted-foreground ml-1">
                      ({step.delta})
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono">{step.color.hsl.h}°</td>
                  <td className="px-3 py-2 font-mono">
                    {step.key === "midtone" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span
                        className={cn(
                          normalizedDiff > 0 ? "text-blue-400" : normalizedDiff < 0 ? "text-orange-400" : ""
                        )}
                      >
                        {normalizedDiff > 0 ? "+" : ""}
                        {normalizedDiff}°
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Copy All Button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => {
          const allHex = variationSteps.map((s) => s.color.hex).join(", ")
          copyToClipboard(allHex)
          setCopiedHex("all")
          setTimeout(() => setCopiedHex(null), 1500)
        }}
      >
        {copiedHex === "all" ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 mr-2" />
            Copy All HEX Values
          </>
        )}
      </Button>
    </div>
  )
}
