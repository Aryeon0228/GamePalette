"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  IoCopyOutline,
  IoCheckmarkOutline,
  IoDiceOutline,
  IoColorWandOutline,
  IoImageOutline,
  IoEyedropOutline,
  IoBookmark,
  IoBookmarkOutline,
  IoCloseOutline,
} from "react-icons/io5"
import { Color } from "@/types"
import { Button } from "@/components/ui/button"
import { ColorLabTools } from "@/components/ColorLabTools"
import { ImageUploader } from "@/components/ImageUploader"
import { ImagePicker } from "@/components/ImagePicker"
import { HistogramSection } from "@/components/HistogramSection"
import { colorFromHex, normalizeHex, randomHex, colorTemperature, bestTextColor, hueFamily } from "@/lib/colorAnalysis"
import { useSavedColors } from "@/stores/savedColorsStore"
import {
  extractColors,
  analyzeLuminosityHistogram,
  type ExtractionMethod,
  type LuminosityHistogram,
} from "@/lib/colorExtractor"
import { copyToClipboard, cn } from "@/lib/utils"

const DEFAULT_HEX = "#5DB8E8"

interface SectionProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}

function Section({ title, subtitle, children, className }: SectionProps) {
  return (
    <section className={cn("border border-border bg-card p-4 space-y-3", className)}>
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
  const isKo = useLocale().startsWith("ko")
  const [mode, setMode] = useState<"compose" | "analyze">("compose")

  const [color, setColor] = useState<Color>(() => colorFromHex(DEFAULT_HEX))
  const [hexInput, setHexInput] = useState<string>(DEFAULT_HEX)
  const [copied, setCopied] = useState<string | null>(null)
  const [sourceColors, setSourceColors] = useState<Color[]>([])
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [extractMethod, setExtractMethod] = useState<ExtractionMethod>("histogram")
  const [histogram, setHistogram] = useState<LuminosityHistogram | null>(null)
  const [showImage, setShowImage] = useState(false)
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
  return (
    <div className="container py-5 space-y-3">
      {/* ── Input bar ── */}
      <div className="sticky top-2 z-30 border border-border bg-card/95 backdrop-blur p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden border border-border">
            <span className="absolute inset-0" style={{ backgroundColor: color.hex }} />
            <input
              type="color"
              value={color.hex}
              onChange={(e) => applyColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label={t("pickColor")}
            />
          </label>

          <div className="flex items-center border border-border bg-background px-3 h-11">
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
                        "px-2.5 py-1 text-[11px] font-medium transition-colors",
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
                        className="h-9 w-9 border border-border transition-transform hover:scale-110"
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
        className="border border-border overflow-hidden flex items-center justify-between gap-4 px-5 py-4"
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
                  className="h-9 w-9 border border-border transition-transform hover:scale-110"
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

      <div className="flex gap-2 border-b border-border pb-3" role="group" aria-label={isKo ? "색상 도구" : "Color tools"}>
        {(["compose", "analyze"] as const).map((item) => (
          <button key={item} type="button" aria-pressed={mode === item} onClick={() => setMode(item)}
            className={cn("border border-border px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", mode === item ? "border-primary text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground")}
          >{item === "compose" ? (isKo ? "조합" : "Compose") : (isKo ? "분석" : "Analyze")}</button>
        ))}
      </div>
      <ColorLabTools hex={color.hex} mode={mode} onSelectColor={applyColor} />
    </div>
  )
}
