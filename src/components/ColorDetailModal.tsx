"use client"

import { useMemo, useState } from "react"
import { IoCheckmarkOutline, IoCopyOutline } from "react-icons/io5"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Color, VariationStyle } from "@/types"
import { generateColorVariations } from "@/lib/styleFilters"
import { HarmonyType, generateColorHarmonies } from "@/lib/colorVision"
import { copyToClipboard } from "@/lib/utils"

interface ColorDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  color: Color | null
}

type ColorFormat = "HEX" | "RGB" | "HSL"

export function ColorDetailModal({ open, onOpenChange, color }: ColorDetailModalProps) {
  const [format, setFormat] = useState<ColorFormat>("HEX")
  const [variationStyle, setVariationStyle] = useState<VariationStyle>("stylized")
  const [selectedHarmony, setSelectedHarmony] = useState<HarmonyType>("complementary")
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const variations = useMemo(() => {
    if (!color) return []
    const generated = generateColorVariations(color, variationStyle)
    return [
      { key: "shadow2", label: "S2", color: generated.shadow2 },
      { key: "shadow1", label: "S1", color: generated.shadow1 },
      { key: "midtone", label: "Base", color: generated.midtone },
      { key: "highlight1", label: "L1", color: generated.highlight1 },
      { key: "highlight2", label: "L2", color: generated.highlight2 },
    ]
  }, [color, variationStyle])

  const harmonies = useMemo(() => (color ? generateColorHarmonies(color.hex) : []), [color])
  const activeHarmony = useMemo(
    () => harmonies.find((harmony) => harmony.type === selectedHarmony) ?? null,
    [harmonies, selectedHarmony]
  )

  const displayValue = useMemo(() => {
    if (!color) return ""
    if (format === "RGB") return `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`
    if (format === "HSL") return `hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`
    return color.hex.toUpperCase()
  }, [color, format])

  const handleCopy = async (value: string, token: string) => {
    await copyToClipboard(value)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 1400)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Color Detail</DialogTitle>
          <DialogDescription>
            Format, variation, and harmony analysis for the selected color.
          </DialogDescription>
        </DialogHeader>

        {!color ? (
          <div className="px-6 py-8 text-sm text-muted-foreground">No color selected.</div>
        ) : (
          <div className="max-h-[72vh] overflow-y-auto px-6 py-5 space-y-6">
            <section className="space-y-3">
              <div
                className="rounded-lg h-24 w-full border border-border flex items-center justify-between px-4"
                style={{ backgroundColor: color.hex }}
              >
                <span className="font-mono text-sm text-white/95">{displayValue}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(displayValue, `main:${displayValue}`)}
                >
                  {copiedToken === `main:${displayValue}` ? (
                    <>
                      <IoCheckmarkOutline className="h-4 w-4 mr-1.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <IoCopyOutline className="h-4 w-4 mr-1.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(["HEX", "RGB", "HSL"] as const).map((candidate) => (
                  <Button
                    key={candidate}
                    variant={format === candidate ? "default" : "outline"}
                    onClick={() => setFormat(candidate)}
                  >
                    {candidate}
                  </Button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Variations</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={variationStyle === "stylized" ? "default" : "outline"}
                    onClick={() => setVariationStyle("stylized")}
                  >
                    Hue Shift
                  </Button>
                  <Button
                    size="sm"
                    variant={variationStyle === "realistic" ? "default" : "outline"}
                    onClick={() => setVariationStyle("realistic")}
                  >
                    Lightness
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {variations.map((variation) => (
                  <button
                    key={variation.key}
                    type="button"
                    className="rounded-md overflow-hidden border border-border text-left"
                    onClick={() => handleCopy(variation.color.hex, `var:${variation.color.hex}`)}
                  >
                    <div className="h-16" style={{ backgroundColor: variation.color.hex }} />
                    <div className="px-2 py-1.5 bg-background">
                      <p className="text-[10px] text-muted-foreground">{variation.label}</p>
                      <p className="text-[10px] font-mono truncate">{variation.color.hex.toUpperCase()}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Harmony</h3>
              <div className="flex flex-wrap gap-2">
                {harmonies.map((harmony) => (
                  <Button
                    key={harmony.type}
                    size="sm"
                    variant={selectedHarmony === harmony.type ? "default" : "outline"}
                    onClick={() => setSelectedHarmony(harmony.type)}
                  >
                    {harmony.name}
                  </Button>
                ))}
              </div>

              {activeHarmony && (
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <p className="text-xs text-muted-foreground">{activeHarmony.description}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {activeHarmony.colors.map((item) => (
                      <button
                        type="button"
                        key={`${activeHarmony.type}-${item.name}-${item.hex}`}
                        className="rounded-md overflow-hidden border border-border text-left"
                        onClick={() => handleCopy(item.hex, `harmony:${item.hex}`)}
                      >
                        <div className="h-14" style={{ backgroundColor: item.hex }} />
                        <div className="px-2 py-1.5 bg-background">
                          <p className="text-[10px] text-muted-foreground">{item.name}</p>
                          <p className="text-[10px] font-mono">{item.hex.toUpperCase()}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
