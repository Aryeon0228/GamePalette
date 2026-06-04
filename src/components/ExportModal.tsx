"use client"
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import {
  IoDownloadOutline,
  IoCopyOutline,
  IoCheckmarkOutline,
  IoLockClosedOutline,
} from "react-icons/io5"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Palette, ExportFormat } from "@/types"
import {
  exportPalette,
  exportToJson,
  exportToCss,
  exportToScss,
  exportToUnity,
  exportToUnreal,
  buildShadingScheme,
  downloadFile,
  SnsCardType,
} from "@/lib/exporters"
import { SphereShadingPreview } from "@/components/SphereShadingPreview"
import { imageToAscii, type AsciiArtResult } from "@/lib/asciiArt"
import { copyToClipboard } from "@/lib/utils"

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  palette: Palette
  isPro?: boolean
}

interface ExportOption {
  format: ExportFormat
  /** Maps to exportModal.opt.<optKey>Label / <optKey>Desc in the message catalog. */
  optKey: string
  action: "download" | "copy"
  proOnly?: boolean
}

const exportOptions: ExportOption[] = [
  { format: "png", optKey: "png", action: "download" },
  { format: "json", optKey: "json", action: "download" },
  { format: "lighting", optKey: "lighting", action: "download" },
  { format: "css", optKey: "css", action: "copy" },
  { format: "scss", optKey: "scss", action: "copy" },
  { format: "unity", optKey: "unity", action: "download", proOnly: true },
  { format: "unreal", optKey: "unreal", action: "download", proOnly: true },
]

export function ExportModal({ open, onOpenChange, palette, isPro = false }: ExportModalProps) {
  const t = useTranslations("exportModal")
  const tShading = useTranslations("shading")
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [pngMode, setPngMode] = useState<"moodboard" | "sns">("sns")
  const [snsCardType, setSnsCardType] = useState<SnsCardType>("instagram")
  const [cardShowHex, setCardShowHex] = useState(true)
  const [cardShowStats, setCardShowStats] = useState(true)
  const [cardShowHistogram, setCardShowHistogram] = useState(true)
  const [asciiWidth, setAsciiWidth] = useState(80)
  const [asciiArt, setAsciiArt] = useState<AsciiArtResult | null>(null)
  const [asciiGenerating, setAsciiGenerating] = useState(false)
  const [asciiCopied, setAsciiCopied] = useState(false)

  const previewRatio = snsCardType === "twitter" ? "16 / 9" : "1 / 1"
  const previewColors = palette.colors
  const shading = useMemo(
    () => (palette.colors.length > 0 ? buildShadingScheme(palette) : null),
    [palette]
  )

  const handleExport = async (option: ExportOption) => {
    if (option.proOnly && !isPro) {
      return
    }

    setIsExporting(option.format)

    try {
      if (option.action === "download") {
        if (option.format === "png") {
          await exportPalette(palette, "png", {
            mode: pngMode,
            snsCardType,
            showHex: cardShowHex,
            showStats: cardShowStats,
            showHistogram: cardShowHistogram,
          })
        } else {
          await exportPalette(palette, option.format)
        }
      } else {
        let content = ""
        switch (option.format) {
          case "css":
            content = exportToCss(palette)
            break
          case "scss":
            content = exportToScss(palette)
            break
          case "json":
            content = exportToJson(palette)
            break
          case "unity":
            content = exportToUnity(palette)
            break
          case "unreal":
            content = exportToUnreal(palette)
            break
        }
        await copyToClipboard(content)
        setCopiedFormat(option.format)
        setTimeout(() => setCopiedFormat(null), 2000)
      }
    } catch (error) {
      console.error("Export failed:", error)
    } finally {
      setIsExporting(null)
    }
  }

  const safeName = palette.name.replace(/[^a-zA-Z0-9-_]/g, "_")

  const handleGenerateAscii = async () => {
    if (!palette.sourceImageUrl) return
    setAsciiGenerating(true)
    try {
      const result = await imageToAscii(palette.sourceImageUrl, {
        width: asciiWidth,
        colors: palette.colors,
      })
      setAsciiArt(result)
    } catch (error) {
      console.error("ASCII generation failed:", error)
    } finally {
      setAsciiGenerating(false)
    }
  }

  const handleCopyAscii = async () => {
    if (!asciiArt) return
    await copyToClipboard(asciiArt.text)
    setAsciiCopied(true)
    setTimeout(() => setAsciiCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="sm:max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { name: palette.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[76vh] overflow-y-auto px-6 py-5 space-y-5">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{t("pngLayout")}</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={pngMode === "sns" ? "default" : "outline"}
                onClick={() => setPngMode("sns")}
              >
                {t("snsCard")}
              </Button>
              <Button
                size="sm"
                variant={pngMode === "moodboard" ? "default" : "outline"}
                onClick={() => setPngMode("moodboard")}
              >
                {t("moodboard")}
              </Button>
            </div>

            {pngMode === "sns" && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={snsCardType === "instagram" ? "default" : "outline"}
                    onClick={() => setSnsCardType("instagram")}
                  >
                    {t("instagram")}
                  </Button>
                  <Button
                    size="sm"
                    variant={snsCardType === "twitter" ? "default" : "outline"}
                    onClick={() => setSnsCardType("twitter")}
                  >
                    {t("twitter")}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={cardShowHex ? "secondary" : "outline"}
                    onClick={() => setCardShowHex((value) => !value)}
                  >
                    {t("hex")}
                  </Button>
                  <Button
                    size="sm"
                    variant={cardShowStats ? "secondary" : "outline"}
                    onClick={() => setCardShowStats((value) => !value)}
                  >
                    {t("stats")}
                  </Button>
                  <Button
                    size="sm"
                    variant={cardShowHistogram ? "secondary" : "outline"}
                    onClick={() => setCardShowHistogram((value) => !value)}
                  >
                    {t("histogram")}
                  </Button>
                </div>

                <div className="rounded-lg overflow-hidden border border-border bg-zinc-900 text-white p-3">
                  <div
                    className="w-full rounded-md bg-gradient-to-br from-zinc-800 to-zinc-700 p-3 relative overflow-hidden"
                    style={{ aspectRatio: previewRatio }}
                  >
                    {palette.sourceImageUrl && (
                      <img
                        src={palette.sourceImageUrl}
                        alt="source"
                        className="absolute right-3 top-3 w-24 h-24 rounded-md object-cover opacity-90"
                      />
                    )}
                    <p className="text-sm font-semibold truncate pr-28">{palette.name}</p>
                    <p className="text-[11px] text-zinc-300">{t("colorsCount", { count: palette.colors.length })}</p>

                    <div className="absolute left-3 right-3 bottom-3 space-y-2">
                      <div className="flex gap-1.5">
                        {previewColors.map((color) => (
                          <div
                            key={color.hex}
                            className="flex-1 rounded-sm min-h-10 flex items-center justify-center"
                            style={{ backgroundColor: color.hex }}
                          >
                            {cardShowHex && previewColors.length <= 8 && (
                              <span className="text-[9px] font-mono text-black/80">{color.hex.toUpperCase()}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {cardShowStats && (
                        <div className="text-[10px] text-zinc-300">{t("styleExportReady", { style: palette.style })}</div>
                      )}
                      {cardShowHistogram && (
                        <div className="h-6 flex items-end gap-1">
                          {previewColors.map((color, index) => (
                            <div
                              key={`${color.hex}-${index}`}
                              className="flex-1 bg-sky-400/80 rounded-sm"
                              style={{ height: `${18 + (index % 4) * 12}%` }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {shading && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">{t("sphereShading")}</h3>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <SphereShadingPreview scheme={shading} className="w-44 h-40 shrink-0" />
                <div className="grid grid-cols-1 gap-1.5 w-full">
                  {[shading.specular, shading.midtone, shading.shadow, shading.rim, shading.background].map(
                    (swatch) => (
                      <div key={swatch.role} className="flex items-center gap-2">
                        <span
                          className="h-6 w-6 rounded shrink-0 border border-border"
                          style={{ backgroundColor: swatch.hex }}
                        />
                        <span className="text-xs font-medium w-24">{tShading(swatch.role)}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{swatch.hex}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("shadingNote")}
              </p>
            </section>
          )}

          {palette.sourceImageUrl && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">{t("asciiArt")}</h3>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { w: 60, key: "small" },
                  { w: 80, key: "medium" },
                  { w: 120, key: "large" },
                ].map((opt) => (
                  <Button
                    key={opt.w}
                    size="sm"
                    variant={asciiWidth === opt.w ? "default" : "outline"}
                    onClick={() => setAsciiWidth(opt.w)}
                  >
                    {t(opt.key)}
                  </Button>
                ))}
                <Button size="sm" variant="secondary" onClick={handleGenerateAscii} disabled={asciiGenerating}>
                  {asciiGenerating ? t("generating") : asciiArt ? t("regenerate") : t("generate")}
                </Button>
              </div>

              {asciiArt && (
                <div className="space-y-2">
                  <div className="rounded-lg border border-border bg-background overflow-auto max-h-64">
                    <pre
                      className="font-mono leading-none p-3 whitespace-pre"
                      style={{ fontSize: "5px" }}
                      // Generated locally from a fixed glyph ramp + palette hex; no user-supplied markup.
                      dangerouslySetInnerHTML={{ __html: asciiArt.htmlBody }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={handleCopyAscii}>
                      {asciiCopied ? (
                        <>
                          <IoCheckmarkOutline className="h-4 w-4 mr-1" />
                          {t("copied")}
                        </>
                      ) : (
                        <>
                          <IoCopyOutline className="h-4 w-4 mr-1" />
                          {t("copyText")}
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadFile(asciiArt.text, `${safeName}-ascii.txt`, "text/plain")}
                    >
                      <IoDownloadOutline className="h-4 w-4 mr-1" />
                      {t("txt")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadFile(asciiArt.html, `${safeName}-ascii.html`, "text/html")}
                    >
                      <IoDownloadOutline className="h-4 w-4 mr-1" />
                      {t("htmlColor")}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          <div className="space-y-2">
            {exportOptions.map((option) => {
              const isLocked = option.proOnly && !isPro
              const isCopied = copiedFormat === option.format
              const isLoading = isExporting === option.format

              return (
                <div
                  key={option.format}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isLocked
                      ? "border-border bg-muted/50 opacity-75"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  } transition-colors`}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{t(`opt.${option.optKey}Label`)}</span>
                      {isLocked && (
                        <span className="text-xs bg-gradient-to-r from-sky-600 to-cyan-500 text-white px-2 py-0.5 rounded-full">
                          {t("pro")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{t(`opt.${option.optKey}Desc`)}</p>
                  </div>

                  <Button
                    variant={isLocked ? "outline" : "secondary"}
                    size="sm"
                    onClick={() => handleExport(option)}
                    disabled={isLoading}
                  >
                    {isLocked ? (
                      <IoLockClosedOutline className="h-4 w-4" />
                    ) : isCopied ? (
                      <>
                        <IoCheckmarkOutline className="h-4 w-4 mr-1" />
                        {t("copied")}
                      </>
                    ) : option.action === "download" ? (
                      <>
                        <IoDownloadOutline className="h-4 w-4 mr-1" />
                        {t("download")}
                      </>
                    ) : (
                      <>
                        <IoCopyOutline className="h-4 w-4 mr-1" />
                        {t("copy")}
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>

          {!isPro && (
            <div className="border-t border-border pt-4">
              <Button className="w-full bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-700 hover:to-cyan-600">
                {t("upgradeButton")}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                {t("upgradeHint")}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
