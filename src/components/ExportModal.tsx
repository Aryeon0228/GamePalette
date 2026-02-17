"use client"
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react"
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
  SnsCardType,
} from "@/lib/exporters"
import { copyToClipboard } from "@/lib/utils"

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  palette: Palette
  isPro?: boolean
}

interface ExportOption {
  format: ExportFormat
  label: string
  description: string
  action: "download" | "copy"
  proOnly?: boolean
}

const exportOptions: ExportOption[] = [
  {
    format: "png",
    label: "PNG Image",
    description: "Moodboard or SNS card export",
    action: "download",
  },
  {
    format: "json",
    label: "JSON",
    description: "Structured data format",
    action: "download",
  },
  {
    format: "css",
    label: "CSS Variables",
    description: "Ready for web projects",
    action: "copy",
  },
  {
    format: "scss",
    label: "SCSS Variables",
    description: "With color map included",
    action: "copy",
  },
  {
    format: "unity",
    label: "Unity ScriptableObject",
    description: "C# code for Unity",
    action: "download",
    proOnly: true,
  },
  {
    format: "unreal",
    label: "Unreal DataTable CSV",
    description: "Import as DataTable",
    action: "download",
    proOnly: true,
  },
]

export function ExportModal({ open, onOpenChange, palette, isPro = false }: ExportModalProps) {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [pngMode, setPngMode] = useState<"moodboard" | "sns">("sns")
  const [snsCardType, setSnsCardType] = useState<SnsCardType>("instagram")
  const [cardShowHex, setCardShowHex] = useState(true)
  const [cardShowStats, setCardShowStats] = useState(true)
  const [cardShowHistogram, setCardShowHistogram] = useState(true)

  const previewRatio = snsCardType === "twitter" ? "16 / 9" : "1 / 1"
  const previewColors = useMemo(() => palette.colors.slice(0, 8), [palette.colors])

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="sm:max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>Export Palette</DialogTitle>
          <DialogDescription>
            Choose a format to export &ldquo;{palette.name}&rdquo;
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[76vh] overflow-y-auto px-6 py-5 space-y-5">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">PNG Layout</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={pngMode === "sns" ? "default" : "outline"}
                onClick={() => setPngMode("sns")}
              >
                SNS Card
              </Button>
              <Button
                size="sm"
                variant={pngMode === "moodboard" ? "default" : "outline"}
                onClick={() => setPngMode("moodboard")}
              >
                Moodboard
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
                    Instagram (1:1)
                  </Button>
                  <Button
                    size="sm"
                    variant={snsCardType === "twitter" ? "default" : "outline"}
                    onClick={() => setSnsCardType("twitter")}
                  >
                    Twitter/X (16:9)
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={cardShowHex ? "secondary" : "outline"}
                    onClick={() => setCardShowHex((value) => !value)}
                  >
                    HEX
                  </Button>
                  <Button
                    size="sm"
                    variant={cardShowStats ? "secondary" : "outline"}
                    onClick={() => setCardShowStats((value) => !value)}
                  >
                    Stats
                  </Button>
                  <Button
                    size="sm"
                    variant={cardShowHistogram ? "secondary" : "outline"}
                    onClick={() => setCardShowHistogram((value) => !value)}
                  >
                    Histogram
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
                    <p className="text-[11px] text-zinc-300">{palette.colors.length} colors</p>

                    <div className="absolute left-3 right-3 bottom-3 space-y-2">
                      <div className="flex gap-1.5">
                        {previewColors.map((color) => (
                          <div
                            key={color.hex}
                            className="flex-1 rounded-sm min-h-10 flex items-center justify-center"
                            style={{ backgroundColor: color.hex }}
                          >
                            {cardShowHex && (
                              <span className="text-[9px] font-mono text-black/80">{color.hex.toUpperCase()}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {cardShowStats && (
                        <div className="text-[10px] text-zinc-300">Style: {palette.style} · Export ready</div>
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
                      <span className="font-medium">{option.label}</span>
                      {isLocked && (
                        <span className="text-xs bg-gradient-to-r from-[#3b426a] to-[#4f7bb8] text-white px-2 py-0.5 rounded-full">
                          Pro
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
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
                        Copied
                      </>
                    ) : option.action === "download" ? (
                      <>
                        <IoDownloadOutline className="h-4 w-4 mr-1" />
                        Download
                      </>
                    ) : (
                      <>
                        <IoCopyOutline className="h-4 w-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>

          {!isPro && (
            <div className="border-t border-border pt-4">
              <Button className="w-full bg-gradient-to-r from-[#3b426a] to-[#4f7bb8] hover:from-[#33385d] hover:to-[#466da2]">
                Upgrade to Pro - $3.99/month
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Unlock Unity/Unreal export, cloud sync, and more
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
