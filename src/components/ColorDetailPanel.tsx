"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { IoCheckmarkOutline, IoCopyOutline } from "react-icons/io5"
import { Button } from "@/components/ui/button"
import { ColorChannelBar } from "@/components/ColorChannelBar"
import { ColdwarmGrid } from "@/components/ColdwarmGrid"
import { HarmonyWheel } from "@/components/HarmonyWheel"
import { Color, VariationStyle } from "@/types"
import { generateColorVariations } from "@/lib/styleFilters"
import { HarmonyType, generateColorHarmonies } from "@/lib/colorVision"
import { copyToClipboard, contrastRatio } from "@/lib/utils"
import { COLOR_FORMATS, ColorFormat, formatColor, getChannels } from "@/lib/colorFormats"

interface ColorDetailPanelProps {
  color: Color | null
}

// Stable keys mapping lib data → message catalog keys.
const HARMONY_KEY: Record<HarmonyType, string> = {
  complementary: "complementary",
  analogous: "analogous",
  triadic: "triadic",
  "split-complementary": "split",
  tetradic: "tetradic",
}

const HARMONY_ROLE_KEY: Record<string, string> = {
  Base: "roleBase",
  Complement: "roleComplement",
  Left: "roleLeft",
  Right: "roleRight",
  Second: "roleSecond",
  Third: "roleThird",
  Fourth: "roleFourth",
  "Split 1": "roleSplit1",
  "Split 2": "roleSplit2",
}

export function ColorDetailPanel({ color }: ColorDetailPanelProps) {
  const t = useTranslations("colorDetail")
  const th = useTranslations("harmony")
  const [format, setFormat] = useState<ColorFormat>("HEX")
  const [variationStyle, setVariationStyle] = useState<VariationStyle>("stylized")
  const [selectedHarmony, setSelectedHarmony] = useState<HarmonyType>("complementary")
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const variations = useMemo(() => {
    if (!color) return []
    const generated = generateColorVariations(color, variationStyle)
    return [
      { key: "shadow2", labelKey: "stepS2", color: generated.shadow2 },
      { key: "shadow1", labelKey: "stepS1", color: generated.shadow1 },
      { key: "midtone", labelKey: "stepBase", color: generated.midtone },
      { key: "highlight1", labelKey: "stepL1", color: generated.highlight1 },
      { key: "highlight2", labelKey: "stepL2", color: generated.highlight2 },
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

  const displayValue = useMemo(() => (color ? formatColor(color, format) : ""), [color, format])

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
          <h2 className="text-lg font-semibold truncate">{color.name || t("title")}</h2>
        </div>
        <div
          className="rounded-lg h-24 w-full border border-border flex items-center justify-between px-4"
          style={{ backgroundColor: color.hex }}
        >
          <span className="font-mono text-sm text-white/95 drop-shadow min-w-0 truncate mr-2">{displayValue}</span>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => handleCopy(displayValue, `main:${displayValue}`)}
          >
            {copiedToken === `main:${displayValue}` ? (
              <>
                <IoCheckmarkOutline className="h-4 w-4 mr-1.5" />
                {t("copied")}
              </>
            ) : (
              <>
                <IoCopyOutline className="h-4 w-4 mr-1.5" />
                {t("copy")}
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {COLOR_FORMATS.map((candidate) => (
            <Button
              key={candidate}
              size="sm"
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
          <h3 className="text-sm font-semibold">{t("channels")}</h3>
          <span className="text-[10px] font-mono text-muted-foreground">{format}</span>
        </div>
        <div className="space-y-2">
          {getChannels(color, format).map((ch) => (
            <ColorChannelBar
              key={`${format}-${ch.label}`}
              label={ch.label}
              value={ch.value}
              max={ch.max}
              color={ch.color}
              hueTrack={ch.hueTrack}
              bipolar={ch.bipolar}
              display={ch.display}
            />
          ))}
        </div>
      </section>

      {complementHex && complementContrast !== null && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("complementaryContrast")}</h3>
            <span className="text-xs text-muted-foreground">
              {t("ratio")}{" "}
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
                {copiedToken === `comp-base:${color.hex}` ? t("copied") : color.hex.toUpperCase()}
              </button>
              <button
                type="button"
                className="flex-1 flex items-center justify-center font-mono text-xs"
                style={{ backgroundColor: complementHex, color: color.hex }}
                onClick={() => handleCopy(complementHex, `comp:${complementHex}`)}
              >
                {copiedToken === `comp:${complementHex}` ? t("copied") : complementHex.toUpperCase()}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("complementNote")}
          </p>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t("variations")}</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={variationStyle === "stylized" ? "default" : "outline"}
              onClick={() => setVariationStyle("stylized")}
            >
              {t("hueShift")}
            </Button>
            <Button
              size="sm"
              variant={variationStyle === "realistic" ? "default" : "outline"}
              onClick={() => setVariationStyle("realistic")}
            >
              {t("lightness")}
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
                <p className="text-[10px] text-muted-foreground">{t(variation.labelKey)}</p>
                <p className="text-[10px] font-mono truncate">{variation.color.hex.toUpperCase()}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <ColdwarmGrid color={color} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">{t("harmony")}</h3>
        <div className="flex flex-wrap gap-2">
          {harmonies.map((harmony) => (
            <Button
              key={harmony.type}
              size="sm"
              variant={selectedHarmony === harmony.type ? "default" : "outline"}
              onClick={() => setSelectedHarmony(harmony.type)}
            >
              {th(`${HARMONY_KEY[harmony.type]}Name`)}
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
              <p className="text-xs text-muted-foreground flex-1">{th(`${HARMONY_KEY[activeHarmony.type]}Desc`)}</p>
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
                    <p className="text-[10px] text-muted-foreground">{th(HARMONY_ROLE_KEY[item.name] ?? "roleBase")}</p>
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
