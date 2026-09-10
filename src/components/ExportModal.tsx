"use client"
/* eslint-disable @next/next/no-img-element */

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"
import { useLocale, useTranslations } from "next-intl"
import { IoCheckmarkOutline, IoCopyOutline, IoDownloadOutline, IoLockClosedOutline } from "react-icons/io5"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ExportFormat, Palette } from "@/types"
import {
  downloadFile, exportPalette, exportToCss, exportToJson, exportToPng, exportToScss,
  exportToShading, exportToSnsPng, exportToUnity, exportToUnreal, type SnsCardType,
} from "@/lib/exporters"
import { cn, copyToClipboard } from "@/lib/utils"

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  palette: Palette
  isPro?: boolean
}
interface ExportOption { format: Exclude<ExportFormat, "png">; optKey: string; proOnly?: boolean }
const exportOptions: ExportOption[] = [
  { format: "json", optKey: "json" },
  { format: "css", optKey: "css" },
  { format: "scss", optKey: "scss" },
  { format: "lighting", optKey: "lighting" },
  { format: "unity", optKey: "unity", proOnly: true },
  { format: "unreal", optKey: "unreal", proOnly: true },
]
const CONTROL = "inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 border border-border px-3 py-2 text-xs font-medium transition-colors hover:border-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-40"

export function ExportModal({ open, onOpenChange, palette, isPro = false }: ExportModalProps) {
  const t = useTranslations("exportModal")
  const isKo = useLocale().startsWith("ko")
  const label = (ko: string, en: string) => isKo ? ko : en
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [copiedFormat, setCopiedFormat] = useState<ExportFormat | null>(null)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [feedback, setFeedback] = useState<"copied" | "downloaded" | "error" | null>(null)
  const [pngMode, setPngMode] = useState<"moodboard" | "sns">("sns")
  const [snsCardType, setSnsCardType] = useState<SnsCardType>("instagram")
  const [showHex, setShowHex] = useState(true)
  const [showStats, setShowStats] = useState(true)
  const [showHistogram, setShowHistogram] = useState(true)
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null)
  const [previewStatus, setPreviewStatus] = useState<"loading" | "ready" | "error">("loading")
  const [previewRevision, setPreviewRevision] = useState(0)

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    dialogRef.current?.focus()
    setFeedback(null)
    return () => {
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [open])
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current) }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    let objectUrl: string | null = null
    setPreview(null)
    setPreviewStatus("loading")
    const timer = setTimeout(async () => {
      try {
        const blob = pngMode === "sns"
          ? await exportToSnsPng(palette, { snsCardType, showHex, showStats, showHistogram })
          : await exportToPng(palette)
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setPreview({ url: objectUrl, blob })
        setPreviewStatus("ready")
      } catch {
        if (!cancelled) setPreviewStatus("error")
      }
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(timer)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [open, palette, pngMode, snsCardType, showHex, showStats, showHistogram, previewRevision])

  const handleExport = async (format: ExportFormat, action: "copy" | "download", proOnly = false) => {
    if (proOnly && !isPro) return
    setExporting(format)
    setFeedback(null)
    try {
      if (action === "download") {
        if (format === "png" && preview) {
          downloadFile(preview.blob, `${palette.name.replace(/[^a-zA-Z0-9-_]/g, "_") || "palette"}.png`)
        } else {
          await exportPalette(palette, format, { mode: pngMode, snsCardType, showHex, showStats, showHistogram })
        }
        setFeedback("downloaded")
      } else {
        const content = format === "json" ? exportToJson(palette)
          : format === "css" ? exportToCss(palette)
            : format === "scss" ? exportToScss(palette)
              : format === "lighting" ? exportToShading(palette)
                : format === "unity" ? exportToUnity(palette) : exportToUnreal(palette)
        await copyToClipboard(content)
        setCopiedFormat(format)
        setFeedback("copied")
        if (copyTimer.current) clearTimeout(copyTimer.current)
        copyTimer.current = setTimeout(() => setCopiedFormat(null), 1800)
      }
    } catch { setFeedback("error") }
    finally { setExporting(null) }
  }

  const handleDialogKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); onOpenChange(false); return }
    if (event.key !== "Tab") return
    const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (!first || !last) { event.preventDefault(); return }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}
        onKeyDown={handleDialogKeys} onClose={() => onOpenChange(false)}
        className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-none border-border bg-card p-0 shadow-none backdrop-blur-none supports-[backdrop-filter]:bg-card sm:rounded-none"
      >
        <DialogHeader className="shrink-0 border-b border-border px-5 py-5 pr-12 text-left">
          <DialogTitle id={titleId}>{t("title")}</DialogTitle>
          <DialogDescription id={descriptionId} className="break-words text-xs">{t("description", { name: palette.name })}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-5">
          <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="min-w-0 space-y-4">
              <div><h3 className="text-sm font-semibold">{t("pngLayout")}</h3><p className="mt-1 text-[11px] text-muted-foreground">{label("내보낼 이미지의 실제 미리보기입니다.", "A preview of the image you will export.")}</p></div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("pngLayout")}>
                {(["sns", "moodboard"] as const).map((mode) => <button type="button" key={mode} className={cn(CONTROL, pngMode === mode && "border-primary bg-primary/10 text-primary")} aria-pressed={pngMode === mode} onClick={() => setPngMode(mode)}>{mode === "sns" ? t("snsCard") : t("moodboard")}</button>)}
              </div>
              {pngMode === "sns" && <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={label("이미지 비율", "Image aspect ratio")}>
                  {(["instagram", "twitter"] as const).map((type) => <button type="button" key={type} className={cn(CONTROL, snsCardType === type && "border-primary text-primary")} aria-pressed={snsCardType === type} onClick={() => setSnsCardType(type)}>{t(type)}</button>)}
                </div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={label("카드에 포함할 정보", "Information to include")}>
                  {([{ key: "hex", selected: showHex, change: setShowHex }, { key: "stats", selected: showStats, change: setShowStats }, { key: "histogram", selected: showHistogram, change: setShowHistogram }]).map((option) => <button type="button" key={option.key} aria-pressed={option.selected} onClick={() => option.change(!option.selected)} className={cn(CONTROL, option.selected && "border-primary text-primary")}><span className="inline-block w-3">{option.selected ? "✓" : ""}</span>{t(option.key)}</button>)}
                </div>
              </div>}
              <div className="flex min-h-48 max-h-80 items-start justify-center overflow-auto border border-border bg-background" aria-busy={previewStatus === "loading"}>
                {preview && previewStatus === "ready" ? <img src={preview.url} alt={label("PNG 내보내기 미리보기", "PNG export preview")} className="block h-auto w-full" /> : <div className="flex min-h-48 flex-col items-center justify-center gap-3 p-5 text-center text-xs text-muted-foreground"><p>{previewStatus === "error" ? label("미리보기를 만들지 못했습니다.", "Could not create the preview.") : label("미리보기를 만드는 중…", "Rendering preview…")}</p>{previewStatus === "error" && <button type="button" className={CONTROL} onClick={() => setPreviewRevision((value) => value + 1)}>{label("다시 시도", "Try again")}</button>}</div>}
              </div>
              <button type="button" className={cn(CONTROL, "w-full border-primary text-primary")} onClick={() => handleExport("png", "download")} disabled={!!exporting || previewStatus !== "ready"}><IoDownloadOutline className="h-4 w-4" />{exporting === "png" ? label("내보내는 중…", "Exporting…") : label("PNG 다운로드", "Download PNG")}</button>
            </section>
            <section className="min-w-0 space-y-4">
              <div><h3 className="text-sm font-semibold">{label("데이터 · 코드", "Data & code")}</h3><p className="mt-1 text-[11px] text-muted-foreground">{label("파일로 저장하거나 프로젝트에 복사하세요.", "Download a file or copy directly into your project.")}</p></div>
              <div className="divide-y divide-border border-y border-border">
                {exportOptions.map((option) => {
                  const locked = !!option.proOnly && !isPro
                  const title = option.format === "lighting" ? label("라이팅 JSON", "Lighting JSON") : t(`opt.${option.optKey}Label`)
                  return <div key={option.format} className="space-y-2.5 py-4">
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="text-xs font-semibold">{title}</h4>{locked && <span className="border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">PRO</span>}</div><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{t(`opt.${option.optKey}Desc`)}</p></div>
                    <div className="flex flex-wrap gap-1.5">
                      {locked ? <button type="button" className={CONTROL} disabled><IoLockClosedOutline className="h-3.5 w-3.5" />{label("Pro 전용", "Pro only")}</button> : <>
                        <button type="button" className={CONTROL} onClick={() => handleExport(option.format, "download", option.proOnly)} disabled={!!exporting} aria-label={`${title} ${t("download")}`}><IoDownloadOutline className="h-3.5 w-3.5" />{exporting === option.format ? label("처리 중…", "Working…") : t("download")}</button>
                        <button type="button" className={CONTROL} onClick={() => handleExport(option.format, "copy", option.proOnly)} disabled={!!exporting} aria-label={`${title} ${t("copy")}`}>{copiedFormat === option.format ? <IoCheckmarkOutline className="h-3.5 w-3.5" /> : <IoCopyOutline className="h-3.5 w-3.5" />}{copiedFormat === option.format ? t("copied") : t("copy")}</button>
                      </>}
                    </div>
                  </div>
                })}
              </div>
              {!isPro && <p className="text-[11px] leading-relaxed text-muted-foreground">{label("Unity와 Unreal 내보내기는 Pro 전용 기능입니다.", "Unity and Unreal exports are available with Pro.")}</p>}
            </section>
          </div>
        </div>
        <div className="shrink-0 border-t border-border px-5 py-3">
          <p role={feedback === "error" ? "alert" : "status"} className={cn("min-h-4 text-xs", feedback === "error" ? "text-red-400" : "text-muted-foreground")}>
            {feedback === "error" ? label("내보내지 못했습니다. 다시 시도하거나 다른 형식을 선택해주세요.", "Export failed. Try again or choose another format.") : feedback === "copied" ? label("클립보드에 복사했습니다.", "Copied to clipboard.") : feedback === "downloaded" ? label("다운로드를 시작했습니다.", "Download started.") : label("작업 팔레트의 현재 색상을 내보냅니다.", "Exports the current colors in your working palette.")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
