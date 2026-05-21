"use client"

import { useMemo, useState } from "react"
import { IoCheckmarkOutline, IoCopyOutline } from "react-icons/io5"
import { Button } from "@/components/ui/button"
import { ColorChannelBar } from "@/components/ColorChannelBar"
import { HarmonyWheel } from "@/components/HarmonyWheel"
import { Color, VariationStyle } from "@/types"
import { generateColorVariations } from "@/lib/styleFilters"
import { HarmonyType, generateColorHarmonies } from "@/lib/colorVision"
import { copyToClipboard, contrastRatio } from "@/lib/utils"

interface ColorDetailPanelProps {
  color: Color | null
}

type ColorFormat = "HEX" | "RGB" | "HSL"

export function ColorDetailPanel({ color }: ColorDetailPanelProps) {
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

  const complementHex = useMemo(() => {
    const complementary = harmonies.find((harmony) => harmony.type === "complementary")
    return complementary?.colors[1]?.hex ?? null
  }, [harmonies])

  const complementContrast = useMemo(
    () => (color && complementHex ? contrastRatio(color.hex, complementHex) : null),
    [color, complementHex]
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

  if (!color) return null

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold truncate">{color.name || "Color Detail"}</h2>
        </div>
        <div
          className="rounded-lg h-24 w-full border border-border flex items-center justify-between px-4"
          style={{ backgroundColor: color.hex }}
        >
          <span className="font-mono text-sm text-white/95 drop-shadow">{displayValue}</span>
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
        <h3 className="text-sm font-semibold">Channels</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          <div className="space-y-2">
            <ColorChannelBar label="R" value={color.rgb.r} max={255} color="#ef4444" />
            <ColorChannelBar label="G" value={color.rgb.g} max={255} color="#22c55e" />
            <ColorChannelBar label="B" value={color.rgb.b} max={255} color="#3b82f6" />
          </div>
          <div className="space-y-2">
            <ColorChannelBar label="H" value={color.hsl.h} max={360} color={color.hex} hueTrack unit="°" />
            <ColorChannelBar label="S" value={color.hsl.s} max={100} color={color.hex} unit="%" />
            <ColorChannelBar label="L" value={color.hsl.l} max={100} color={color.hex} unit="%" />
          </div>
        </div>
      </section>

      {complementHex && complementContrast !== null && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Complementary Contrast</h3>
            <span className="text-xs text-muted-foreground">
              Ratio{" "}
              <span className="font-mono font-semibold text-foreground">
                {complementContrast.toFixed(2)}:1
              </span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <HarmonyWheel
              baseHue={color.hsl.h}
              colors={[
                { hex: color.hex, angle: 0 },
                { hex: complementHex, angle: 180 },
              ]}
              size={96}
            />
            <div className="flex-1 flex h-20 overflow-hidden rounded-lg border border-border">
              <button
                type="button"
                className="flex-1 flex items-center justify-center font-mono text-xs"
                style={{ backgroundColor: color.hex, color: complementHex }}
                onClick={() => handleCopy(color.hex, `comp-base:${color.hex}`)}
              >
                {copiedToken === `comp-base:${color.hex}` ? "Copied" : color.hex.toUpperCase()}
              </button>
              <button
                type="button"
                className="flex-1 flex items-center justify-center font-mono text-xs"
                style={{ backgroundColor: complementHex, color: color.hex }}
                onClick={() => handleCopy(complementHex, `comp:${complementHex}`)}
              >
                {copiedToken === `comp:${complementHex}` ? "Copied" : complementHex.toUpperCase()}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            The dots show the base and its 180° complement on the wheel. Higher ratios read more clearly when paired.
          </p>
        </section>
      )}

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
            <div className="flex items-center gap-4">
              <HarmonyWheel
                baseHue={color.hsl.h}
                colors={activeHarmony.colors.map((item) => ({ hex: item.hex, angle: item.angle }))}
                size={104}
              />
              <p className="text-xs text-muted-foreground flex-1">{activeHarmony.description}</p>
            </div>
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
  )
}
