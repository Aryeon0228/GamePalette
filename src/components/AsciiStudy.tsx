"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { IoCheckmarkOutline, IoCopyOutline, IoDownloadOutline, IoImageOutline, IoRefreshOutline } from "react-icons/io5"
import type { Palette } from "@/types"
import { imageToAscii, type AsciiArtResult } from "@/lib/asciiArt"
import { colorFromHex, normalizeHex } from "@/lib/colorAnalysis"
import { downloadFile } from "@/lib/exporters"
import { cn, copyToClipboard } from "@/lib/utils"

interface AsciiStudyProps {
  imageUrl: string | null
  palette: Palette | null
  onImport: () => void
}

const CONTROL = "inline-flex min-h-9 items-center justify-center gap-1.5 border border-border px-3 py-2 text-xs font-medium transition-colors hover:border-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-40"

export function AsciiStudy({ imageUrl, palette, onImport }: AsciiStudyProps) {
  const t = useTranslations("exportModal")
  const isKo = useLocale().startsWith("ko")
  const label = (ko: string, en: string) => isKo ? ko : en
  const [width, setWidth] = useState(80)
  const [view, setView] = useState<"color" | "text">("color")
  const [art, setArt] = useState<AsciiArtResult | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<"copied" | "downloaded" | "generate-error" | "copy-error" | "download-error" | null>(null)
  const request = useRef({ id: 0 })
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const paletteHexes = palette?.colors.map((color) => color.hex).join(",") ?? ""
  // The HTML renderer only receives normalized hex values, never imported markup.
  const colors = useMemo(() => paletteHexes.split(",").map(normalizeHex).filter((hex): hex is string => !!hex).map(colorFromHex), [paletteHexes])

  useEffect(() => {
    const generation = request.current
    generation.id++
    setArt(null)
    setGenerating(false)
    setFeedback(null)
    setCopied(false)
    return () => { generation.id++ }
  }, [imageUrl, width, paletteHexes])
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current) }, [])

  const generate = async () => {
    if (!imageUrl) return
    const id = ++request.current.id
    setGenerating(true)
    setFeedback(null)
    try {
      const result = await imageToAscii(imageUrl, { width, colors })
      if (id === request.current.id) setArt(result)
    } catch {
      if (id === request.current.id) setFeedback("generate-error")
    } finally {
      if (id === request.current.id) setGenerating(false)
    }
  }

  const copy = async () => {
    if (!art) return
    try {
      await copyToClipboard(art.text)
      setCopied(true)
      setFeedback("copied")
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 1800)
    } catch { setFeedback("copy-error") }
  }

  const download = (type: "text" | "html") => {
    if (!art) return
    try {
      const name = (palette?.name || "pixel-paw").replace(/[^a-zA-Z0-9-_]/g, "_")
      downloadFile(type === "text" ? art.text : art.html, `${name}-ascii.${type === "text" ? "txt" : "html"}`, type === "text" ? "text/plain;charset=utf-8" : "text/html;charset=utf-8")
      setFeedback("downloaded")
    } catch { setFeedback("download-error") }
  }

  const feedbackText = feedback === "copied" ? label("텍스트를 복사했습니다.", "Text copied to clipboard.")
    : feedback === "downloaded" ? label("파일 다운로드를 시작했습니다.", "File download started.")
      : feedback === "generate-error" ? label("이미지를 변환하지 못했습니다. 다시 시도하거나 다른 이미지를 가져오세요.", "Could not convert the image. Try again or import another image.")
        : feedback === "copy-error" ? label("복사하지 못했습니다. TXT 파일로 저장해 주세요.", "Could not copy the text. Download the TXT file instead.")
          : feedback === "download-error" ? label("파일을 저장하지 못했습니다. 다시 시도해 주세요.", "Could not save the file. Please try again.") : ""

  return (
    <section className="space-y-5">
      <div className="space-y-1.5 border-b border-border pb-4">
        <h3 className="text-lg font-semibold tracking-tight">{t("asciiArt")}</h3>
        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">{label("이미지를 문자로 바꾸고 작업 팔레트로 색을 입혀보세요.", "Turn an image into characters, then color it with your working palette.")}</p>
      </div>
      {!imageUrl ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-4 border border-dashed border-border px-5 py-10 text-center">
          <IoImageOutline className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{label("먼저 색 가져오기에서 이미지를 올려주세요.", "Import an image to start your ASCII study.")}</p>
          <button type="button" className={CONTROL} onClick={onImport}>{label("이미지 가져오기", "Import an image")}</button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground">{label("한 줄의 문자 수", "Characters per row")}</p>
              <div className="flex gap-1.5" role="group" aria-label={label("ASCII 너비", "ASCII width")}>
                {[40, 80, 120].map((value) => <button key={value} type="button" aria-pressed={width === value} onClick={() => setWidth(value)} className={cn(CONTROL, "min-w-14 font-mono", width === value && "border-primary bg-primary/10 text-primary")}>{value}</button>)}
              </div>
            </div>
            <button type="button" className={cn(CONTROL, "border-primary text-primary")} onClick={generate} disabled={generating}>
              <IoRefreshOutline className={cn("h-4 w-4", generating && "animate-spin")} />
              {generating ? t("generating") : art ? t("regenerate") : t("generate")}
            </button>
          </div>
          {art ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1.5" role="group" aria-label={label("미리보기 방식", "Preview appearance")}>
                  {(["color", "text"] as const).map((value) => <button key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)} className={cn(CONTROL, view === value && "border-primary text-primary")}>{value === "color" ? label("팔레트 색상", "Palette colors") : label("텍스트", "Plain text")}</button>)}
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">{art.cols} × {art.rows}</span>
              </div>
              <div className="max-h-[32rem] overflow-auto border border-border bg-background p-4" tabIndex={0} aria-label={label("ASCII 미리보기, 스크롤 가능", "ASCII preview, scrollable")}>
                {view === "color" ? <pre className="m-0 w-max font-mono text-[8px] leading-[8px] tracking-normal" dangerouslySetInnerHTML={{ __html: art.htmlBody }} />
                  : <pre className="m-0 w-max font-mono text-[8px] leading-[8px] tracking-normal text-foreground">{art.text}</pre>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={CONTROL} onClick={copy}>{copied ? <IoCheckmarkOutline className="h-4 w-4" /> : <IoCopyOutline className="h-4 w-4" />}{copied ? t("copied") : t("copyText")}</button>
                <button type="button" className={CONTROL} onClick={() => download("text")}><IoDownloadOutline className="h-4 w-4" />TXT</button>
                <button type="button" className={CONTROL} onClick={() => download("html")}><IoDownloadOutline className="h-4 w-4" />{t("htmlColor")}</button>
              </div>
            </div>
          ) : <div className="flex min-h-64 items-center justify-center border border-border px-6 py-12 text-center text-xs text-muted-foreground" aria-busy={generating}>{generating ? t("generating") : label("너비를 고른 뒤 생성 버튼을 눌러보세요.", "Choose a width, then generate your study.")}</div>}
          <p className="text-[11px] leading-relaxed text-muted-foreground">{label("이미지, 너비, 팔레트 색상이 바뀌면 다시 생성하세요. TXT는 문자만, HTML은 팔레트 색상도 저장합니다.", "Generate again after changing the image, width, or palette colors. TXT saves characters; HTML includes palette colors.")}</p>
        </>
      )}
      <p role={feedback?.endsWith("error") ? "alert" : "status"} className={cn("min-h-4 text-xs", feedback?.endsWith("error") ? "text-red-400" : "text-muted-foreground")}>{feedbackText}</p>
    </section>
  )
}
