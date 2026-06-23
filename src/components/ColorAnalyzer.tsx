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
  IoBookmark,
  IoBookmarkOutline,
  IoDownloadOutline,
  IoCloseOutline,
} from "react-icons/io5"
import { Color } from "@/types"
import { Button } from "@/components/ui/button"
import { ColorChannelBar } from "@/components/ColorChannelBar"
import { ColdwarmGrid } from "@/components/ColdwarmGrid"
import { HarmonyWheel } from "@/components/HarmonyWheel"
import { ImageUploader } from "@/components/ImageUploader"
import { ImagePicker } from "@/components/ImagePicker"
import { HistogramSection } from "@/components/HistogramSection"
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
import { colorToAllFormatsText, colorToJson, colorToCss } from "@/lib/colorExport"
import { downloadFile } from "@/lib/exporters"
import { useSavedColors } from "@/stores/savedColorsStore"
import { COLOR_FORMATS, ColorFormat, formatColor, getChannels } from "@/lib/colorFormats"
import { HarmonyType, generateColorHarmonies, simulateColorBlindness } from "@/lib/colorVision"
import {
  extractColors,
  analyzeLuminosityHistogram,
  type ExtractionMethod,
  type LuminosityHistogram,
} from "@/lib/colorExtractor"
import { copyToClipboard, cn } from "@/lib/utils"

const DEFAULT_HEX = "#5DB8E8"

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

const CVD_TYPES = ["protanopia", "deuteranopia", "tritanopia"] as const
const GRADIENT_PARTNERS: GradientPartner[] = ["complement", "analogous", "triad"]
const GRADIENT_STOPS = [5, 7, 9, 12]
// HEX has no channels of its own (it falls back to RGB), so it's not a
// selectable option for the channel breakdown.
const CHANNEL_FORMATS: ColorFormat[] = COLOR_FORMATS.filter((f) => f !== "HEX")

interface SectionProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}

function Section({ title, subtitle, children, className }: SectionProps) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-3.5 space-y-2.5", className)}>
      <div className="space-y-0.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
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
  const [format, setFormat] = useState<ColorFormat>("RGB")
  const [harmony, setHarmony] = useState<HarmonyType>("complementary")
  const [copied, setCopied] = useState<string | null>(null)
  const [sourceColors, setSourceColors] = useState<Color[]>([])
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [extractMethod, setExtractMethod] = useState<ExtractionMethod>("histogram")
  const [histogram, setHistogram] = useState<LuminosityHistogram | null>(null)
  const [showImage, setShowImage] = useState(false)
  const [gradientStops, setGradientStops] = useState(7)
  const [gradientEasing, setGradientEasing] = useState<EasingName>("sinusoidal")
  const [gradientPartner, setGradientPartner] = useState<GradientPartner>("complement")
  const [supportsEyedropper, setSupportsEyedropper] = useState(false)
  const [mounted, setMounted] = useState(false)
  const initializedHash = useRef(false)

  const savedColors = useSavedColors((s) => s.colors)
  const toggleSaved = useSavedColors((s) => s.toggle)
  const removeSaved = useSavedColors((s) => s.remove)
  const isSaved = mounted && savedColors.includes(color.hex.toUpperCase())

  // Initialize from URL hash (#5db8e8) once, then keep it in sync — shareable.
  useEffect(() => {
    const fromHash = normalizeHex(window.location.hash.replace(/^#/, ""))
    if (fromHash) {
      setColor(colorFromHex(fromHash))
      setHexInput(fromHash)
    }
    initializedHash.current = true
    setSupportsEyedropper("EyeDropper" in window)
    setMounted(true)
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

  const exportBaseName = () =>
    (color.name || "color").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
    "-" +
    color.hex.replace(/^#/, "").toLowerCase()

  const handleExportJson = () =>
    downloadFile(colorToJson(color), `${exportBaseName()}.json`, "application/json")
  const handleExportCss = () => downloadFile(colorToCss(color), `${exportBaseName()}.css`, "text/css")

  const runExtraction = async (url: string, method: ExtractionMethod) => {
    try {
      const colors = await extractColors(url, 8, method)
      setSourceColors(colors)
    } catch (error) {
      console.error("Failed to extract colors:", error)
    }
  }

  const handleImageLoad = async (url: string) => {
    setImageUrl(url)
    runExtraction(url, extractMethod)
    analyzeLuminosityHistogram(url)
      .then(setHistogram)
      .catch(() => setHistogram(null))
  }

  const handleMethodChange = (method: ExtractionMethod) => {
    setExtractMethod(method)
    if (imageUrl) runExtraction(imageUrl, method)
  }

  const handleClearImage = () => {
    setImageUrl(null)
    setSourceColors([])
    setHistogram(null)
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
    () =>
      COLOR_FORMATS.map((fmt) => {
        // `value` is the full CSS string we copy; `display` drops the
        // redundant function wrapper (the label badge already says the
        // format) so only the numbers show — e.g. rgb(93, 184, 232) → 93 184 232.
        const value = formatColor(color, fmt)
        const display =
          fmt === "HEX"
            ? value
            : value
                .replace(/^[a-z]+\(/i, "")
                .replace(/\)$/, "")
                .replace(/,\s*/g, " ")
        return { fmt, value, display }
      }),
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
    <div className="container py-5 space-y-3">
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

          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSaved(color.hex)}
            className="h-11"
          >
            {isSaved ? <IoBookmark className="h-4 w-4 mr-1.5" /> : <IoBookmarkOutline className="h-4 w-4 mr-1.5" />}
            {isSaved ? t("saved") : t("save")}
          </Button>

          <div className="ml-auto flex items-center gap-1.5">
            <IoColorWandOutline className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{color.name}</span>
          </div>
        </div>
      </div>

      {/* ── Image source panel (in flow, not sticky) ── */}
      {showImage && (
        <Section title={t("fromImage")} subtitle={t("fromImageSub")}>
          {imageUrl ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex gap-1">
                  {(["histogram", "kmeans"] as ExtractionMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleMethodChange(m)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                        extractMethod === m ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
                      )}
                    >
                      {t(`method.${m}`)}
                    </button>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="h-7" onClick={handleClearImage}>
                  <IoCloseOutline className="h-3.5 w-3.5 mr-1" />
                  {t("clearImage")}
                </Button>
              </div>

              <ImagePicker src={imageUrl} onPick={applyColor} />
              <p className="text-[11px] text-muted-foreground">{t("pickHint")}</p>

              {sourceColors.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">{t("extractedColors")}</p>
                  <div className="flex flex-wrap gap-2">
                    {sourceColors.map((c, i) => (
                      <button
                        key={`src-${i}-${c.hex}`}
                        type="button"
                        title={c.hex}
                        onClick={() => applyColor(c.hex)}
                        className="h-9 w-9 rounded-lg border border-border transition-transform hover:scale-110"
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {histogram && <HistogramSection histogram={histogram} />}
            </div>
          ) : (
            <ImageUploader onImageLoad={handleImageLoad} />
          )}
        </Section>
      )}

      {/* ── Hero ── */}
      <div
        className="rounded-xl border border-border overflow-hidden flex items-center justify-between gap-4 px-5 py-4"
        style={{ backgroundColor: color.hex, color: textColor }}
      >
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={() => handleCopy(color.hex, "hero")}
            className="font-mono text-3xl font-bold tracking-tight flex items-center gap-2 shrink-0"
          >
            {color.hex}
            {copied === "hero" ? (
              <IoCheckmarkOutline className="h-5 w-5" />
            ) : (
              <IoCopyOutline className="h-4 w-4 opacity-60" />
            )}
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">{color.name}</h1>
            <p className="text-[11px] uppercase tracking-widest opacity-70">{t(`temp.${temperature}`)}</p>
          </div>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-medium border shrink-0"
          style={{ borderColor: textColor, opacity: 0.85 }}
        >
          {t(`family.${family}`)}
        </span>
      </div>

      {/* ── Saved colors ── */}
      {mounted && savedColors.length > 0 && (
        <Section title={t("savedTitle")} subtitle={t("savedSub")}>
          <div className="flex flex-wrap gap-2">
            {savedColors.map((hex) => (
              <div key={hex} className="group relative">
                <button
                  type="button"
                  title={hex}
                  onClick={() => applyColor(hex)}
                  className="h-9 w-9 rounded-lg border border-border transition-transform hover:scale-110"
                  style={{ backgroundColor: hex }}
                />
                <button
                  type="button"
                  aria-label={t("removeColor")}
                  onClick={() => removeSaved(hex)}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-card text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground group-hover:opacity-100"
                >
                  <IoCloseOutline className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Shading scheme (full-width ramp) ── */}
      <Section title={t("shadingTitle")} subtitle={t("shadingSub")}>
        <div className="grid grid-cols-7 gap-1.5">
          {shading.map(({ role, color: c }) => (
            <button
              key={role}
              type="button"
              onClick={() => handleCopy(c.hex, `shade:${role}`)}
              className="rounded-lg overflow-hidden border border-border text-left group"
            >
              <div className="h-14 relative" style={{ backgroundColor: c.hex }}>
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                  {copied === `shade:${role}` ? (
                    <IoCheckmarkOutline className="h-4 w-4 text-white" />
                  ) : (
                    <IoCopyOutline className="h-3.5 w-3.5 text-white" />
                  )}
                </span>
              </div>
              <div className="px-1.5 py-1 bg-background">
                <p className="text-[11px] font-medium leading-tight truncate">{t(`shade.${role}`)}</p>
                <p className="text-[10px] font-mono text-muted-foreground truncate">{c.hex}</p>
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Modules (masonry — packs cards by height, no wasted space) ── */}
      <div className="gap-3 columns-1 md:columns-2 xl:columns-3 [&>section]:mb-3 [&>section]:break-inside-avoid">
        {/* Formats + channels */}
        <Section title={t("formatsTitle")} subtitle={t("formatsSub")}>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {t("channels")}
              </h3>
              <div className="flex flex-wrap gap-1">
                {CHANNEL_FORMATS.map((fmt) => (
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
            </div>
            {/* Reserve 4 rows so switching to a 4-channel format (CMYK)
                doesn't change the card height and reflow the masonry. */}
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
              {Array.from({ length: Math.max(0, 4 - channels.length) }).map((_, i) => (
                <div key={`ch-spacer-${i}`} className="h-4" aria-hidden />
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full border-collapse text-left">
              <tbody>
                {allFormats.map(({ fmt, value, display }) => (
                  <tr
                    key={fmt}
                    title={`${fmt} — ${t(`fmtDesc.${fmt}`)}\n${value}`}
                    onClick={() => handleCopy(value, `fmt:${fmt}`)}
                    className="group cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/50"
                  >
                    <td className="w-16 py-1.5 pl-2.5 align-middle">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary">{fmt}</span>
                    </td>
                    <td className="py-1.5 px-2 align-middle font-mono text-xs">
                      <span className="block max-w-[14rem] truncate">{display}</span>
                    </td>
                    <td className="w-7 py-1.5 pr-2.5 text-right align-middle">
                      {copied === `fmt:${fmt}` ? (
                        <IoCheckmarkOutline className="inline h-3.5 w-3.5 text-primary" />
                      ) : (
                        <IoCopyOutline className="inline h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Export */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 flex-1"
              onClick={() => handleCopy(colorToAllFormatsText(color), "copyAll")}
            >
              {copied === "copyAll" ? (
                <IoCheckmarkOutline className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <IoCopyOutline className="h-3.5 w-3.5 mr-1.5" />
              )}
              {t("copyAll")}
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={handleExportJson}>
              <IoDownloadOutline className="h-3.5 w-3.5 mr-1.5" />
              JSON
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={handleExportCss}>
              <IoDownloadOutline className="h-3.5 w-3.5 mr-1.5" />
              CSS
            </Button>
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
          <div className="flex gap-4">
            {/* Left: type chips + color list */}
            <div className="flex-1 min-w-0 space-y-2.5">
              <div className="flex flex-wrap gap-1.5">
                {harmonies.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setHarmony(item.type)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[11px] font-medium transition-colors",
                      harmony === item.type ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
                    )}
                  >
                    {th(`${HARMONY_KEY[item.type]}Name`)}
                  </button>
                ))}
              </div>

              {/* Reserve 4 rows (max, tetradic) so switching harmonies
                  doesn't change the card height and reflow the masonry. */}
              <div className="space-y-1">
                {activeHarmony.colors.map((c, i) => (
                  <button
                    key={`${activeHarmony.type}-${i}-${c.hex}`}
                    type="button"
                    onClick={() => handleCopy(c.hex, `harm:${c.hex}:${i}`)}
                    className="group flex items-center gap-2 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-left hover:border-primary transition-colors"
                  >
                    <span
                      className="h-7 w-7 shrink-0 rounded-md border border-border"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="min-w-0">
                      <span className="block text-[10px] text-muted-foreground leading-tight">
                        {th(HARMONY_ROLE_KEY[c.name] ?? "roleBase")}
                      </span>
                      <span className="block font-mono text-xs leading-tight">{c.hex.toUpperCase()}</span>
                    </span>
                    {copied === `harm:${c.hex}:${i}` ? (
                      <IoCheckmarkOutline className="ml-auto h-3.5 w-3.5 text-primary shrink-0" />
                    ) : (
                      <IoCopyOutline className="ml-auto h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                ))}
                {Array.from({ length: Math.max(0, 4 - activeHarmony.colors.length) }).map((_, i) => (
                  <div
                    key={`harm-spacer-${i}`}
                    aria-hidden
                    className="flex items-center gap-2 w-full rounded-lg border border-transparent px-2 py-1.5"
                  >
                    <span className="h-7 w-7 shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right: large wheel + description */}
            <div className="shrink-0 flex flex-col items-center gap-2 w-[136px]">
              <HarmonyWheel
                baseHue={color.hsl.h}
                colors={activeHarmony.colors.map((c) => ({ hex: c.hex, angle: c.angle }))}
                size={136}
              />
              <p className="text-[11px] text-muted-foreground text-center leading-snug">
                {th(`${HARMONY_KEY[activeHarmony.type]}Desc`)}
              </p>
            </div>
          </div>
        </Section>

        {/* Coldwarm */}
        <Section title={t("coldwarmTitle")} subtitle={t("coldwarmSub")}>
          <ColdwarmGrid color={color} showTitle={false} />
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
          <p className="text-[10px] text-muted-foreground/80">{t("contrastHint")}</p>
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
        <Section title={t("psyTitle")} subtitle={t("psySub")}>
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
              <span className="text-[11px] text-muted-foreground">{t("closestName")}</span>
              <span className="text-sm font-semibold truncate">{color.name}</span>
            </div>
            <div className="rounded-lg border border-border bg-background p-3 space-y-1.5">
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
