"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import {
  IoCopyOutline,
  IoCheckmarkOutline,
  IoDiceOutline,
  IoColorWandOutline,
  IoImageOutline,
  IoEyedropOutline,
} from "react-icons/io5"
import { Color } from "@/types"
import { Button } from "@/components/ui/button"
import { ColorChannelBar } from "@/components/ColorChannelBar"
import { ColdwarmGrid } from "@/components/ColdwarmGrid"
import { HarmonyWheel } from "@/components/HarmonyWheel"
import { ImageUploader } from "@/components/ImageUploader"
import {
  colorFromHex,
  normalizeHex,
  randomHex,
  generateTints,
  generateShades,
  generateTones,
  colorTemperature,
  bestTextColor,
  contrastReport,
  hueFamily,
  generateShadingScheme,
  generateGradientPalette,
  EASING_NAMES,
  EasingName,
  GradientPartner,
} from "@/lib/colorAnalysis"
import { COLOR_FORMATS, ColorFormat, formatColor, getChannels } from "@/lib/colorFormats"
import { HarmonyType, generateColorHarmonies, simulateColorBlindness } from "@/lib/colorVision"
import { extractColors } from "@/lib/colorExtractor"
import { copyToClipboard, cn } from "@/lib/utils"

const DEFAULT_HEX = "#5DB8E8"

const HARMONY_KEY: Record<HarmonyType, string> = {
  complementary: "complementary",
  analogous: "analogous",
  triadic: "triadic",
  "split-complementary": "split",
  tetradic: "tetradic",
}

const CVD_TYPES = ["protanopia", "deuteranopia", "tritanopia"] as const
const GRADIENT_PARTNERS: GradientPartner[] = ["complement", "analogous", "triad"]
const GRADIENT_STOPS = [5, 7, 9, 12]

interface SectionProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}

function Section({ title, subtitle, children, className }: SectionProps) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 space-y-4", className)}>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

export function ColorAnalyzer() {
  const t = useTranslations("analyzer")
  const th = useTranslations("harmony")

  const [color, setColor] = useState<Color>(() => colorFromHex(DEFAULT_HEX))
  const [hexInput, setHexInput] = useState<string>(DEFAULT_HEX)
  const [format, setFormat] = useState<ColorFormat>("HEX")
  const [harmony, setHarmony] = useState<HarmonyType>("complementary")
  const [copied, setCopied] = useState<string | null>(null)
  const [sourceColors, setSourceColors] = useState<Color[]>([])
  const [showImage, setShowImage] = useState(false)
  const [gradientStops, setGradientStops] = useState(7)
  const [gradientEasing, setGradientEasing] = useState<EasingName>("sinusoidal")
  const [gradientPartner, setGradientPartner] = useState<GradientPartner>("complement")
  const [supportsEyedropper, setSupportsEyedropper] = useState(false)
  const initializedHash = useRef(false)

  // Initialize from URL hash (#5db8e8) once, then keep it in sync — shareable.
  useEffect(() => {
    const fromHash = normalizeHex(window.location.hash.replace(/^#/, ""))
    if (fromHash) {
      setColor(colorFromHex(fromHash))
      setHexInput(fromHash)
    }
    initializedHash.current = true
    setSupportsEyedropper("EyeDropper" in window)
  }, [])

  const applyColor = useCallback((hex: string) => {
    const c = colorFromHex(hex)
    setColor(c)
    setHexInput(c.hex)
    if (initializedHash.current) {
      window.history.replaceState(null, "", `#${c.hex.replace(/^#/, "").toLowerCase()}`)
    }
  }, [])

  const handleHexCommit = (raw: string) => {
    const normalized = normalizeHex(raw)
    if (normalized) applyColor(normalized)
    else setHexInput(color.hex)
  }

  const handleCopy = async (value: string, token: string) => {
    await copyToClipboard(value)
    setCopied(token)
    setTimeout(() => setCopied(null), 1400)
  }

  const handleImageLoad = async (imageUrl: string) => {
    try {
      const colors = await extractColors(imageUrl, 8, "histogram")
      setSourceColors(colors)
    } catch (error) {
      console.error("Failed to extract colors:", error)
    }
  }

  const handleEyedropper = async () => {
    const w = window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }
    if (!w.EyeDropper) return
    try {
      const result = await new w.EyeDropper().open()
      applyColor(result.sRGBHex)
    } catch {
      /* user cancelled */
    }
  }

  // ── Derived analysis ──
  const temperature = useMemo(() => colorTemperature(color), [color])
  const family = useMemo(() => hueFamily(color), [color])
  const textColor = useMemo(() => bestTextColor(color.hex), [color])
  const tints = useMemo(() => generateTints(color), [color])
  const shades = useMemo(() => generateShades(color), [color])
  const tones = useMemo(() => generateTones(color), [color])
  const shading = useMemo(() => generateShadingScheme(color), [color])
  const gradient = useMemo(
    () => generateGradientPalette(color, { stops: gradientStops, easing: gradientEasing, partner: gradientPartner }),
    [color, gradientStops, gradientEasing, gradientPartner]
  )
  const harmonies = useMemo(() => generateColorHarmonies(color.hex), [color])
  const activeHarmony = useMemo(
    () => harmonies.find((item) => item.type === harmony) ?? harmonies[0],
    [harmonies, harmony]
  )
  const channels = useMemo(() => getChannels(color, format), [color, format])
  const onWhite = useMemo(() => contrastReport(color.hex, "#FFFFFF"), [color])
  const onBlack = useMemo(() => contrastReport(color.hex, "#000000"), [color])
  const cvd = useMemo(
    () => CVD_TYPES.map((type) => ({ type, hex: simulateColorBlindness(color.hex, type) })),
    [color]
  )

  const allFormats = useMemo(
    () => COLOR_FORMATS.map((fmt) => ({ fmt, value: formatColor(color, fmt) })),
    [color]
  )

  const Ramp = ({ label, colors }: { label: string; colors: Color[] }) => (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <div className="flex rounded-lg overflow-hidden border border-border h-12">
        {colors.map((c, i) => (
          <button
            key={`${label}-${i}-${c.hex}`}
            type="button"
            title={c.hex}
            className="flex-1 relative group"
            style={{ backgroundColor: c.hex }}
            onClick={() => handleCopy(c.hex, `ramp:${label}:${i}`)}
          >
            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
              {copied === `ramp:${label}:${i}` ? (
                <IoCheckmarkOutline className="h-3.5 w-3.5 text-white" />
              ) : (
                <IoCopyOutline className="h-3 w-3 text-white" />
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="container py-8 space-y-6">
      {/* ── Input bar ── */}
      <div className="sticky top-2 z-30 rounded-2xl border border-border bg-card/95 backdrop-blur p-3 shadow-[0_8px_28px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="relative h-11 w-11 shrink-0 cursor-pointer rounded-xl overflow-hidden border border-border">
            <span className="absolute inset-0" style={{ backgroundColor: color.hex }} />
            <input
              type="color"
              value={color.hex}
              onChange={(e) => applyColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label={t("pickColor")}
            />
          </label>

          <div className="flex items-center rounded-xl border border-border bg-background px-3 h-11">
            <span className="text-muted-foreground font-mono text-sm mr-1">#</span>
            <input
              value={hexInput.replace(/^#/, "")}
              onChange={(e) => setHexInput(e.target.value)}
              onBlur={(e) => handleHexCommit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleHexCommit((e.target as HTMLInputElement).value)
              }}
              spellCheck={false}
              maxLength={7}
              className="w-24 bg-transparent font-mono text-sm uppercase outline-none"
              aria-label={t("hexInput")}
            />
          </div>

          <Button variant="outline" size="sm" onClick={() => applyColor(randomHex())} className="h-11">
            <IoDiceOutline className="h-4 w-4 mr-1.5" />
            {t("random")}
          </Button>

          {supportsEyedropper && (
            <Button variant="outline" size="sm" onClick={handleEyedropper} className="h-11">
              <IoEyedropOutline className="h-4 w-4 mr-1.5" />
              {t("eyedropper")}
            </Button>
          )}

          <Button
            variant={showImage ? "default" : "outline"}
            size="sm"
            onClick={() => setShowImage((v) => !v)}
            className="h-11"
          >
            <IoImageOutline className="h-4 w-4 mr-1.5" />
            {t("fromImage")}
          </Button>

          <div className="ml-auto flex items-center gap-1.5">
            <IoColorWandOutline className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{color.name}</span>
          </div>
        </div>

        {showImage && (
          <div className="mt-3 space-y-3">
            <ImageUploader onImageLoad={handleImageLoad} />
            {sourceColors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sourceColors.map((c, i) => (
                  <button
                    key={`src-${i}-${c.hex}`}
                    type="button"
                    title={c.hex}
                    onClick={() => applyColor(c.hex)}
                    className="h-8 w-8 rounded-lg border border-border transition-transform hover:scale-110"
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Hero ── */}
      <div
        className="rounded-2xl border border-border overflow-hidden flex flex-col justify-between p-6 min-h-[180px]"
        style={{ backgroundColor: color.hex, color: textColor }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-70">{t(`temp.${temperature}`)}</p>
            <h1 className="text-3xl font-bold mt-1">{color.name}</h1>
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-medium border"
            style={{ borderColor: textColor, opacity: 0.85 }}
          >
            {t(`family.${family}`)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => handleCopy(color.hex, "hero")}
          className="self-start font-mono text-4xl font-bold tracking-tight flex items-center gap-3 mt-4"
        >
          {color.hex}
          {copied === "hero" ? (
            <IoCheckmarkOutline className="h-6 w-6" />
          ) : (
            <IoCopyOutline className="h-5 w-5 opacity-60" />
          )}
        </button>
      </div>

      {/* ── Modules grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formats + channels */}
        <Section title={t("formatsTitle")} subtitle={t("formatsSub")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {allFormats.map(({ fmt, value }) => (
              <button
                key={fmt}
                type="button"
                onClick={() => handleCopy(value, `fmt:${fmt}`)}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left hover:border-primary transition-colors"
              >
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold text-muted-foreground">{fmt}</span>
                  <span className="block font-mono text-xs truncate">{value}</span>
                </span>
                {copied === `fmt:${fmt}` ? (
                  <IoCheckmarkOutline className="h-3.5 w-3.5 text-primary shrink-0" />
                ) : (
                  <IoCopyOutline className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
              </button>
            ))}
          </div>

          <div className="pt-2 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {COLOR_FORMATS.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormat(fmt)}
                  className={cn(
                    "px-2 py-1 rounded-md text-[11px] font-medium transition-colors",
                    format === fmt ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
                  )}
                >
                  {fmt}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {channels.map((ch) => (
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
          </div>
        </Section>

        {/* Tints / Shades / Tones */}
        <Section title={t("rampsTitle")} subtitle={t("rampsSub")}>
          <Ramp label={t("tints")} colors={tints} />
          <Ramp label={t("shades")} colors={shades} />
          <Ramp label={t("tones")} colors={tones} />
        </Section>

        {/* Gradient palette (poline-inspired) */}
        <Section title={t("gradientTitle")} subtitle={t("gradientSub")}>
          <div className="flex rounded-lg overflow-hidden border border-border h-14">
            {gradient.map((c, i) => (
              <button
                key={`grad-${i}-${c.hex}`}
                type="button"
                title={c.hex}
                className="flex-1 relative group"
                style={{ backgroundColor: c.hex }}
                onClick={() => handleCopy(c.hex, `grad:${i}`)}
              >
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                  {copied === `grad:${i}` ? (
                    <IoCheckmarkOutline className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <IoCopyOutline className="h-3 w-3 text-white" />
                  )}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground w-14 shrink-0">{t("partner")}</span>
              <div className="flex flex-wrap gap-1.5">
                {GRADIENT_PARTNERS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setGradientPartner(p)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[11px] font-medium transition-colors",
                      gradientPartner === p ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
                    )}
                  >
                    {t(`gradPartner.${p}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground w-14 shrink-0">{t("easing")}</span>
              <div className="flex flex-wrap gap-1.5">
                {EASING_NAMES.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setGradientEasing(e)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[11px] font-medium transition-colors",
                      gradientEasing === e ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
                    )}
                  >
                    {t(`gradEasing.${e}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground w-14 shrink-0">{t("stops")}</span>
              <div className="flex flex-wrap gap-1.5">
                {GRADIENT_STOPS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setGradientStops(n)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                      gradientStops === n ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Harmonies */}
        <Section title={t("harmonyTitle")} subtitle={t("harmonySub")}>
          <div className="flex flex-wrap gap-1.5">
            {harmonies.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => setHarmony(item.type)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                  harmony === item.type ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
                )}
              >
                {th(`${HARMONY_KEY[item.type]}Name`)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <HarmonyWheel
              baseHue={color.hsl.h}
              colors={activeHarmony.colors.map((c) => ({ hex: c.hex, angle: c.angle }))}
              size={104}
            />
            <p className="text-xs text-muted-foreground flex-1">
              {th(`${HARMONY_KEY[activeHarmony.type]}Desc`)}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {activeHarmony.colors.map((c, i) => (
              <button
                key={`${activeHarmony.type}-${i}-${c.hex}`}
                type="button"
                onClick={() => handleCopy(c.hex, `harm:${c.hex}:${i}`)}
                className="rounded-lg overflow-hidden border border-border text-left"
              >
                <div className="h-12" style={{ backgroundColor: c.hex }} />
                <div className="px-2 py-1 bg-background">
                  <p className="text-[10px] font-mono">
                    {copied === `harm:${c.hex}:${i}` ? t("copied") : c.hex.toUpperCase()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* Coldwarm */}
        <Section title={t("coldwarmTitle")} subtitle={t("coldwarmSub")}>
          <ColdwarmGrid color={color} />
        </Section>

        {/* Shading scheme */}
        <Section title={t("shadingTitle")} subtitle={t("shadingSub")} className="lg:col-span-2">
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {shading.map(({ role, color: c }) => (
              <button
                key={role}
                type="button"
                onClick={() => handleCopy(c.hex, `shade:${role}`)}
                className="rounded-lg overflow-hidden border border-border text-left group"
              >
                <div className="h-16 relative" style={{ backgroundColor: c.hex }}>
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    {copied === `shade:${role}` ? (
                      <IoCheckmarkOutline className="h-4 w-4 text-white" />
                    ) : (
                      <IoCopyOutline className="h-3.5 w-3.5 text-white" />
                    )}
                  </span>
                </div>
                <div className="px-2 py-1.5 bg-background">
                  <p className="text-[10px] font-medium leading-tight">{t(`shade.${role}`)}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{c.hex}</p>
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* Contrast + accessibility (kept compact) */}
        <Section title={t("contrastTitle")} subtitle={t("contrastSub")}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { bg: "#FFFFFF", label: t("onWhite"), report: onWhite },
              { bg: "#000000", label: t("onBlack"), report: onBlack },
            ].map(({ bg, label, report }) => (
              <div key={bg} className="rounded-lg border border-border overflow-hidden">
                <div
                  className="h-16 flex items-center justify-center font-semibold"
                  style={{ backgroundColor: bg, color: color.hex }}
                >
                  Aa
                </div>
                <div className="px-3 py-2 bg-background space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{label}</span>
                    <span className="font-mono text-sm font-semibold">{report.ratio.toFixed(2)}:1</span>
                  </div>
                  <div className="flex gap-1">
                    <Badge ok={report.aaLarge} label="AA Large" />
                    <Badge ok={report.aaNormal} label="AA" />
                    <Badge ok={report.aaaNormal} label="AAA" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {t("bestText")}{" "}
            <span className="font-mono font-semibold text-foreground">
              {textColor === "#FFFFFF" ? t("white") : t("black")}
            </span>
          </p>
        </Section>

        {/* Color blindness */}
        <Section title={t("cvdTitle")} subtitle={t("cvdSub")}>
          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1.5">
              <div className="h-14 rounded-lg border border-border" style={{ backgroundColor: color.hex }} />
              <p className="text-[10px] text-center text-muted-foreground">{t("cvdNormal")}</p>
            </div>
            {cvd.map(({ type, hex }) => (
              <div key={type} className="space-y-1.5">
                <div className="h-14 rounded-lg border border-border" style={{ backgroundColor: hex }} />
                <p className="text-[10px] text-center text-muted-foreground">{t(`cvd.${type}`)}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Psychology + naming */}
        <Section title={t("psyTitle")} subtitle={t("psySub")} className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-[11px] text-muted-foreground">{t("closestName")}</p>
              <p className="text-lg font-semibold mt-1">{color.name}</p>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">{color.hex}</p>
            </div>
            <div className="md:col-span-2 rounded-lg border border-border bg-background p-4 space-y-2">
              <p className="text-sm font-semibold">{t(`psy.${family}.title`)}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{t(`psy.${family}.desc`)}</p>
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{t("usage")}: </span>
                {t(`psy.${family}.usage`)}
              </p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "px-1.5 py-0.5 rounded text-[9px] font-bold",
        ok ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/10 text-red-400"
      )}
    >
      {ok ? "✓" : "✕"} {label}
    </span>
  )
}
