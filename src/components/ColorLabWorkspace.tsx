"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { ArrowDownToLine, ArrowUpRight, Check, Copy, Pipette, Plus, Shuffle, Star } from "lucide-react"
import { ImageUploader } from "@/components/ImageUploader"
import { ImageSelector } from "@/components/ImageSelector"
import { ImagePicker } from "@/components/ImagePicker"
import { ColorLabTools } from "@/components/ColorLabTools"
import { PaletteEditor } from "@/components/PaletteEditor"
import { StyleFilter } from "@/components/StyleFilter"
import { ExportModal } from "@/components/ExportModal"
import { HistogramSection } from "@/components/HistogramSection"
import { ColorSphereStudy } from "@/components/ColorSphereStudy"
import { ColorAttributeStudy } from "@/components/ColorAttributeStudy"
import { ColorLightingStudy } from "@/components/ColorLightingStudy"
import { ImageValueStudy } from "@/components/ImageValueStudy"
import { AsciiStudy } from "@/components/AsciiStudy"
import { usePaletteStore } from "@/stores/paletteStore"
import { useSavedColors } from "@/stores/savedColorsStore"
import { useToast } from "@/components/ui/toast"
import { extractColorsWithArea, analyzeLuminosityHistogram, type LuminosityHistogram } from "@/lib/colorExtractor"
import { colorFromHex, colorTemperature, hueFamily } from "@/lib/colorAnalysis"
import { formatColor, type ColorFormat } from "@/lib/colorFormats"
import { resizePaletteColors } from "@/lib/resizePalette"
import { copyToClipboard, generateId, getColorName, hexToRgb, rgbToHsl } from "@/lib/utils"
import type { Color } from "@/types"
import "@/app/color-lab.css"

// One workspace up top (image, palette, current color); the tools below sit behind five tabs,
// so only one group of cards competes for attention at a time.
type ToolTab = "analyze" | "combine" | "shade" | "image" | "study"
const TOOL_TABS: Array<{ id: ToolTab; panel: string; ko: string; en: string; koNote: string; enNote: string }> = [
  { id: "analyze", panel: "color-analyze", ko: "분석", en: "Analyze", koNote: "현재 색의 값, 대비, 색각 차이, 인상을 봅니다.", enNote: "Values, contrast, color vision and impression of the current color." },
  { id: "combine", panel: "color-compose", ko: "배색", en: "Combine", koNote: "현재 색과 함께 쓸 색을 만듭니다.", enNote: "Make colors to use with the current color." },
  { id: "shade", panel: "color-shade", ko: "명암", en: "Shade", koNote: "현재 색으로 밝고 어두운 단계를 만듭니다.", enNote: "Make light and dark steps from the current color." },
  { id: "image", panel: "color-image", ko: "이미지", en: "Image", koNote: "올린 이미지의 색 면적과 밝기 분포를 봅니다.", enNote: "Color areas and brightness across the uploaded image." },
  { id: "study", panel: "color-study", ko: "실험", en: "Experiment", koNote: "색값, 주변색, 조명을 바꾸며 보이는 색을 비교합니다.", enNote: "Compare how values, surroundings and light change what you see." },
]
// Older links point at sections that now live inside a tab; open that tab first.
const TAB_FOR_ANCHOR: Record<string, ToolTab> = {
  ...Object.fromEntries(TOOL_TABS.map(tab => [tab.panel, tab.id])),
  "color-value-study": "image",
  "color-lighting-study": "study",
}
const QUICK_FORMATS: ColorFormat[] = ["RGB", "HSL", "OKLCH"]
const randomHex = () => `#${Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, "0").toUpperCase()}`
const formatArea = (percentage: number) => percentage > 0 && percentage < 0.1 ? "<0.1%" : `${percentage.toFixed(1)}%`
// "rgb(157, 213, 238)" reads as "157 213 238" beside its label.
const bareValue = (value: string) => value.replace(/^[a-z]+\(/i, "").replace(/\)$/, "").replace(/,\s*/g, " ")

type AreaAnalysis = {
  colors: Color[]
  percentages: number[] | null
  sourceImageUrl: string | null
  isRegion: boolean
}

type ColorOrigin = "random" | "selected" | "pixel" | "palette"
type ImageMode = "extract" | "pick"
type WorkspaceSession = {
  paletteId: string
  colors: Color[]
  sourceImageUrl: string | null
  activeHex: string
  selectedIndex: number
  colorOrigin: ColorOrigin
  imageMode: ImageMode
  areaAnalysis: AreaAnalysis | null
  extractionSource: string | null
}

// Keep an in-tab workspace across lab navigation without storing uploaded images
// or transient selections on disk. Only client effects read/write this snapshot.
let workspaceSession: WorkspaceSession | null = null

function makeColor(hex: string): Color {
  const rgb = hexToRgb(hex)
  return { hex: hex.toUpperCase(), rgb, hsl: rgbToHsl(rgb.r, rgb.g, rgb.b), name: getColorName(hex) }
}

export function ColorLabWorkspace() {
  const ko = useLocale() === "ko"
  const label = (kr: string, en: string) => ko ? kr : en
  const ta = useTranslations("analyzer")
  const store = usePaletteStore()
  const savedColors = useSavedColors()
  const { addToast } = useToast()
  const [activeHex, setActiveHex] = useState("#808080")
  const [hexInput, setHexInput] = useState("#808080")
  const [hexError, setHexError] = useState(false)
  const [colorOrigin, setColorOrigin] = useState<ColorOrigin>("random")
  const [ready, setReady] = useState(false)
  const selectionRevision = useRef(0)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [copied, setCopied] = useState<string | null>(null)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<ToolTab>("analyze")
  const tabRefs = useRef<Partial<Record<ToolTab, HTMLButtonElement | null>>>({})
  const toolsRef = useRef<HTMLElement | null>(null)
  // The image stage grows with the viewport, like the stages of the other labs.
  const [stageHeight, setStageHeight] = useState(240)
  useEffect(() => {
    const measure = () => setStageHeight(window.innerWidth < 760 ? 240 : Math.round(Math.min(400, Math.max(220, window.innerHeight - 600))))
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])
  const [imageMode, setImageMode] = useState<ImageMode>("extract")
  const [histogram, setHistogram] = useState<LuminosityHistogram | null>(null)
  const [areaAnalysis, setAreaAnalysis] = useState<AreaAnalysis | null>(null)
  const [areaBusy, setAreaBusy] = useState(false)
  const [canEyedrop, setCanEyedrop] = useState(false)
  const extractionSource = useRef<string | null>(null)
  const paletteResize = useRef<{ paletteId: string; source: Color[]; lastOutput: Color[]; fallbackHex: string } | null>(null)
  const requestId = useRef(0)
  const areaRequestId = useRef(0)
  const initialized = useRef(false)
  const colors = store.currentPalette?.colors ?? []
  const palette = store.currentPalette
  const hasImage = Boolean(store.sourceImageUrl)
  const displayedCount = hasImage ? Math.max(3, Math.min(32, store.colorCount)) : colors.length
  const countLabel = hasImage ? label("추출할 색 수", "Colors to extract") : label("팔레트 색 수", "Palette colors")
  const current = useMemo(() => colorFromHex(activeHex), [activeHex])
  const kept = savedColors.colors.includes(activeHex.toUpperCase())
  // Area belongs to the extracted image colors, not subsequent palette edits.
  const currentArea = !busy && !areaBusy && hasImage && store.extractionMethod === "kmeans"
    && areaAnalysis && areaAnalysis.sourceImageUrl === store.sourceImageUrl
    ? areaAnalysis : null

  useEffect(() => {
    setCanEyedrop("EyeDropper" in window)
    const hydrate = () => {
      if (initialized.current) return
      initialized.current = true
      const url = new URL(window.location.href)
      const isNew = url.searchParams.get("new") === "1"
      const state = usePaletteStore.getState()
      if (isNew) {
        workspaceSession = null
        state.resetCurrentPalette()
        url.searchParams.delete("new")
        window.history.replaceState(window.history.state, "", url.toString())
      }
      if (!state.currentPalette || isNew) {
        const now = new Date().toISOString()
        const initial: Color[] = []
        state.setCurrentPalette({ id: generateId(), name: "Untitled Palette", colors: initial, style: "original", tags: [], createdAt: now, updatedAt: now })
        state.updateColors(initial)
      }
      const current = usePaletteStore.getState()
      const currentPalette = current.currentPalette
      const restored = currentPalette && workspaceSession
        && workspaceSession.paletteId === currentPalette.id
        && workspaceSession.colors === currentPalette.colors
        && workspaceSession.sourceImageUrl === current.sourceImageUrl
        ? workspaceSession : null
      const existing = currentPalette?.colors[0]?.hex
      const first = restored?.activeHex ?? existing ?? randomHex()
      setColorOrigin(restored?.colorOrigin ?? (existing ? "palette" : "random"))
      setSelectedIndex(restored?.selectedIndex ?? 0)
      setImageMode(restored?.imageMode ?? "extract")
      setAreaAnalysis(restored?.areaAnalysis ?? null)
      setReady(true)
      setActiveHex(first)
      setHexInput(first)
      extractionSource.current = restored ? restored.extractionSource : current.sourceImageUrl
    }
    if (usePaletteStore.persist.hasHydrated()) hydrate()
    const stop = usePaletteStore.persist.onFinishHydration(hydrate)
    const pendingRequest = requestId
    const pendingAreaRequest = areaRequestId
    return () => { stop(); pendingRequest.current++; pendingAreaRequest.current++ }
  }, [])

  useEffect(() => {
    // Before hydration the placeholder color must not replace a prior session,
    // including React Strict Mode's first effect setup/cleanup cycle.
    if (!ready || !palette) return
    workspaceSession = {
      paletteId: palette.id,
      colors: palette.colors,
      sourceImageUrl: store.sourceImageUrl,
      activeHex,
      selectedIndex,
      colorOrigin,
      imageMode,
      areaAnalysis,
      extractionSource: extractionSource.current,
    }
  }, [ready, palette, store.sourceImageUrl, activeHex, selectedIndex, colorOrigin, imageMode, areaAnalysis, busy])

  useEffect(() => {
    setHexInput(activeHex)
    setHexError(false)
  }, [activeHex])

  useEffect(() => {
    if (!store.sourceImageUrl) { setHistogram(null); return }
    let cancelled = false
    setHistogram(null)
    analyzeLuminosityHistogram(store.sourceImageUrl).then(result => { if (!cancelled) setHistogram(result) }).catch(() => { if (!cancelled) setHistogram(null) })
    return () => { cancelled = true }
  }, [store.sourceImageUrl])

  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current) }, [])

  // A link to an older section anchor opens the tab that now holds it.
  useEffect(() => {
    const openAnchor = () => {
      const anchor = window.location.hash.slice(1)
      const next = TAB_FOR_ANCHOR[anchor]
      if (!next) return
      setTab(next)
      requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ block: "start" }))
    }
    openAnchor()
    window.addEventListener("hashchange", openAnchor)
    return () => window.removeEventListener("hashchange", openAnchor)
  }, [])

  const openTab = (next: ToolTab, focus = false) => {
    setTab(next)
    if (focus) tabRefs.current[next]?.focus()
    // Switching from deep inside a long panel keeps the new panel's start in view.
    const tools = toolsRef.current
    if (tools && tools.getBoundingClientRect().top < 0) tools.scrollIntoView({ block: "start" })
  }

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TOOL_TABS.length - 1
    const target = event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0 : event.key === "End" ? last : -1
    if (target < 0) return
    event.preventDefault()
    openTab(TOOL_TABS[target].id, true)
  }

  const focusSource = () => {
    const source = document.getElementById("color-import")
    source?.focus({ preventScroll: true })
    source?.scrollIntoView({ block: "start" })
  }

  const selectColor = (hex: string, index?: number, origin: ColorOrigin = index === undefined ? "selected" : "palette") => {
    selectionRevision.current++
    setColorOrigin(origin)
    setActiveHex(hex.toUpperCase())
    if (index !== undefined) setSelectedIndex(index)
  }

  const changeColors = (next: Color[], index: number) => {
    paletteResize.current = null
    requestId.current++
    setBusy(false)
    store.updateColors(next)
    const safeIndex = Math.max(0, Math.min(index, next.length - 1))
    setSelectedIndex(safeIndex)
    if (next[safeIndex]) selectColor(next[safeIndex].hex, safeIndex)
  }

  const addColors = (hexes: string[]) => {
    const next = [...colors]
    for (const hex of hexes) {
      if (next.length < 32 && !next.some(c => c.hex.toUpperCase() === hex.toUpperCase())) next.push(makeColor(hex))
    }
    if (next.length === colors.length) {
      addToast(label("이미 팔레트에 있는 색이거나, 최대 32색에 도달했어요.", "Colors already exist, or the palette has reached 32 colors."), "info")
      return
    }
    changeColors(next, next.length - 1)
    addToast(label("작업 팔레트에 추가했어요.", "Added to your working palette."), "success")
  }

  const commitHex = () => {
    let value = hexInput.trim().replace(/^#/, "")
    if (/^[\da-f]{3}$/i.test(value)) value = value.split("").map(c => c + c).join("")
    if (!/^[\da-f]{6}$/i.test(value)) { setHexError(true); return }
    if (`#${value.toUpperCase()}` !== activeHex) selectColor(`#${value}`)
    setHexInput(`#${value.toUpperCase()}`)
    setHexError(false)
  }

  const copy = async (value: string, token: string) => {
    try {
      await copyToClipboard(value)
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
      setCopied(token)
      copiedTimer.current = setTimeout(() => setCopied(null), 1500)
    }
    catch { addToast(label("색상 코드를 직접 선택해 복사해주세요.", "Select the value to copy it manually."), "error") }
  }

  const eyedrop = async () => {
    const Picker = (window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper
    if (!Picker) return
    try { selectColor((await new Picker().open()).sRGBHex) } catch { /* Escape cancels picking. */ }
  }

  const runExtraction = useCallback(async (src: string, count?: number, method?: "histogram" | "kmeans") => {
    const id = ++requestId.current
    const selectionAtStart = selectionRevision.current
    areaRequestId.current++
    setAreaBusy(false)
    setBusy(true)
    setAreaAnalysis(null)
    try {
      const state = usePaletteStore.getState()
      const extractionCount = Math.max(3, Math.min(32, count ?? state.colorCount))
      state.setColorCount(extractionCount)
      const extractionMethod = method ?? state.extractionMethod
      const result = await extractColorsWithArea(src, extractionCount, extractionMethod)
      if (id !== requestId.current) return
      state.setOriginalColors(result.colors)
      if (extractionMethod === "kmeans") setAreaAnalysis({
        colors: result.colors,
        percentages: result.areaPercentages,
        sourceImageUrl: state.sourceImageUrl,
        isRegion: src !== state.sourceImageUrl,
      })
      const updatedColors = usePaletteStore.getState().currentPalette?.colors ?? []
      const selectionUnchanged = selectionAtStart === selectionRevision.current
      setSelectedIndex(index => selectionUnchanged ? 0 : Math.max(0, Math.min(index, updatedColors.length - 1)))
      const first = updatedColors[0]
      if (first && selectionUnchanged) { setActiveHex(first.hex); setColorOrigin("palette") }
    } catch {
      if (id === requestId.current) addToast(ko ? "이미지에서 색을 추출하지 못했어요. 다른 이미지를 시도해주세요." : "Could not extract colors. Try another image.", "error")
    } finally { if (id === requestId.current) setBusy(false) }
  }, [addToast, ko])

  const analyzeArea = async () => {
    const state = usePaletteStore.getState()
    const sourceImageUrl = state.sourceImageUrl
    const src = extractionSource.current ?? sourceImageUrl
    if (!sourceImageUrl || !src) return
    const id = ++areaRequestId.current
    setAreaBusy(true)
    try {
      // This is image analysis only. Palette colors, original colors, style,
      // selected color, and extraction settings must remain exactly as edited.
      const result = await extractColorsWithArea(src, Math.max(3, Math.min(32, state.colorCount)), "kmeans")
      if (id !== areaRequestId.current || sourceImageUrl !== usePaletteStore.getState().sourceImageUrl) return
      setAreaAnalysis({ colors: result.colors, percentages: result.areaPercentages, sourceImageUrl, isRegion: src !== sourceImageUrl })
    } catch {
      if (id === areaRequestId.current) addToast(label("이미지의 면적을 분석하지 못했어요. 다시 시도해주세요.", "Could not analyze image areas. Please try again."), "error")
    } finally { if (id === areaRequestId.current) setAreaBusy(false) }
  }

  const loadImage = (url: string) => {
    paletteResize.current = null
    store.setSourceImageUrl(url)
    extractionSource.current = url
    void runExtraction(url)
  }

  const clearImage = () => {
    requestId.current++
    areaRequestId.current++
    setAreaBusy(false)
    setBusy(false)
    setAreaAnalysis(null)
    paletteResize.current = null
    extractionSource.current = null
    store.setSourceImageUrl(null)
  }

  const changeMethod = (method: "histogram" | "kmeans") => {
    store.setExtractionMethod(method)
    if (extractionSource.current) void runExtraction(extractionSource.current, undefined, method)
  }

  const changeCount = (count: number) => {
    const state = usePaletteStore.getState()
    if (state.sourceImageUrl) {
      void runExtraction(extractionSource.current ?? state.sourceImageUrl, count)
      return
    }
    const current = state.currentPalette
    if (!current) return
    const previous = paletteResize.current
    // Keep a source snapshot across slider changes so shrinking then expanding
    // restores colors. Any independent palette edit starts a fresh snapshot.
    const snapshot = previous?.paletteId === current.id && previous.lastOutput === current.colors
      ? previous
      : { paletteId: current.id, source: current.colors, fallbackHex: activeHex }
    const next = resizePaletteColors(snapshot.source, count, snapshot.fallbackHex)
    paletteResize.current = { ...snapshot, lastOutput: next }
    requestId.current++
    setBusy(false)
    state.updateColors(next)
    state.setColorCount(Math.max(3, next.length))
    setSelectedIndex(index => Math.max(0, Math.min(index, next.length - 1)))
  }

  const savePalette = () => {
    if (!palette?.colors.length) return
    try {
      const existing = store.savedPalettes.find(item => item.id === palette.id)
      if (existing) store.updatePalette(palette.id, { ...palette, sourceImageUrl: store.sourceImageUrl || palette.sourceImageUrl })
      else store.savePalette(palette.name)
      addToast(label("라이브러리에 팔레트를 저장했어요.", "Palette saved to your library."), "success")
    } catch { addToast(label("저장 공간이 부족해요. 파일로 내보내기를 이용해주세요.", "Storage is full. Export your palette as a file."), "error") }
  }

  const currentPaletteForExport = palette?.colors.length ? { ...palette, sourceImageUrl: store.sourceImageUrl || palette.sourceImageUrl } : null
  const originText = colorOrigin === "random" ? label("시작용 랜덤 색", "Random start")
    : colorOrigin === "pixel" ? label("이미지에서 피킹", "Picked from image")
    : colorOrigin === "palette" ? label("팔레트에서 선택", "From the palette")
    : label("직접 고른 색", "Chosen color")

  const countControl = (
    <label className="cl-range" htmlFor="extract-count">
      <span>{countLabel}</span>
      <input id="extract-count" type="range" aria-label={countLabel} min={hasImage ? 3 : 1} max={32} value={displayedCount} disabled={!palette} onChange={event => changeCount(Number(event.target.value))}/>
      <output htmlFor="extract-count">{displayedCount}</output>
    </label>
  )

  const panelContent = (id: ToolTab) => {
    switch (id) {
      case "analyze":
        return <ColorLabTools overview hex={activeHex} mode="analyze" analysisSection="all" onSelectColor={selectColor}/>
      case "combine":
        return <ColorLabTools overview hex={activeHex} mode="compose" composeSection="combine" onSelectColor={selectColor} onAddColors={ready && !busy ? addColors : undefined}/>
      case "shade":
        return <ColorLabTools overview hex={activeHex} mode="compose" composeSection="shade" onSelectColor={selectColor} onAddColors={ready && !busy ? addColors : undefined} extraCard={<ColorSphereStudy hex={activeHex} onSelectColor={selectColor} />}/>
      case "image":
        return hasImage ? <div className="cl-grid cl-grid-image">
          <section className="cl-card cl-area" aria-labelledby="cl-area-title" aria-busy={busy || areaBusy}>
            <header className="cl-card-head"><h3 id="cl-area-title">{label("색별 면적", "Color areas")}</h3>{currentArea?.percentages && <span className="cl-meta">{currentArea.isRegion ? label("선택 영역 기준", "Selected region") : label("전체 이미지 기준", "Whole image")}</span>}</header>
            {store.extractionMethod !== "kmeans" ? <div className="cl-card-empty">
              <p>{label("면적 기반 · K-Means로 추출하면 색마다 차지하는 면적을 볼 수 있어요.", "Extract with Area-based · K-Means to see how much of the image each color covers.")}</p>
              <button type="button" className="cl-btn" disabled={busy} onClick={() => changeMethod("kmeans")}>{label("K-Means로 다시 추출", "Re-extract with K-Means")}</button>
            </div> : currentArea?.percentages ? <>
              <div className="palette-area-bar" aria-hidden="true">{currentArea.colors.map((color, index) => <span key={index} style={{ backgroundColor: color.hex, width: `${currentArea.percentages![index]}%` }} />)}</div>
              <ul className="palette-area-legend">{currentArea.colors.map((color, index) => <li key={index}><span className="palette-area-chip" style={{ background: color.hex }} aria-hidden="true"/><code>{color.hex}</code><strong>{formatArea(currentArea.percentages![index])}</strong></li>)}</ul>
              <p className="cl-note">{label("축소한 원본 이미지에서 비슷한 색을 묶은 추정치예요. 팔레트 편집과는 별개이며, 불투명도 50% 미만은 제외합니다.", "Estimated from similar colors in a reduced source image, independently of palette edits. Pixels below 50% opacity are excluded.")}</p>
            </> : <div className="cl-card-empty">
              <p>{busy || areaBusy ? label("색과 면적을 분석하고 있어요…", "Analyzing colors and area…") : currentArea ? label("분석할 불투명 픽셀이 없어 면적을 계산할 수 없어요.", "No opaque pixels are available to measure.") : label("이미지의 원래 색을 분석해 면적 비율을 확인하세요. 편집한 팔레트는 유지됩니다.", "Analyze source-image colors to see their area proportions. Your edited palette stays unchanged.")}</p>
              {!busy && !areaBusy && !currentArea && <button type="button" className="cl-btn" onClick={() => void analyzeArea()}>{label("면적 다시 분석", "Analyze area again")}</button>}
            </div>}
          </section>
          <div id="color-value-study" tabIndex={-1} className="cl-card cl-value"><ImageValueStudy imageUrl={store.sourceImageUrl} headingLevel={3}/></div>
          {histogram && <section className="cl-card cl-histogram" aria-labelledby="cl-histogram-title">
            <header className="cl-card-head"><h3 id="cl-histogram-title">{label("밝기 분포", "Brightness")}</h3></header>
            <HistogramSection histogram={histogram}/>
            <p className="cl-note">{label("가중 RGB로 계산해 ‘명암별 면적’과 수치가 다를 수 있어요.", "Computed from weighted RGB, so values may differ from Light & dark areas.")}</p>
          </section>}
          <div className="cl-card cl-ascii"><AsciiStudy imageUrl={store.sourceImageUrl} palette={palette} onImport={focusSource} /></div>
        </div> : <div className="cl-card cl-panel-empty">
          <p>{label("이미지를 올리면 색별 면적, 명암, 밝기 분포, 아스키 아트를 볼 수 있어요.", "Upload an image to see color areas, values, brightness and ASCII art.")}</p>
          <button type="button" className="cl-btn cl-btn-primary" onClick={focusSource}>{label("이미지 올리기", "Upload an image")}</button>
        </div>
      case "study":
        return <div className="cl-grid cl-grid-study"><ColorAttributeStudy hex={activeHex} onSelectColor={selectColor}/><ColorLightingStudy hex={activeHex} onSelectColor={selectColor}/></div>
    }
  }

  const panelFootnote = (id: ToolTab) => id === "study"
    ? <p className="cl-footnote">{label("형태의 명암을 봤다면, 이미지 전체의 밝고 어두운 면적도 비교해보세요.", "After studying a form, compare the light and dark areas across an image.")} <button type="button" onClick={() => openTab("image")}>{label("이미지 탭으로", "Open the Image tab")} →</button></p>
    : id === "image"
    ? <p className="cl-footnote" id="color-composition">{label("구도 · 명암 덩어리 실험은 Composition Lab에서 할 수 있어요.", "Frame and value-mass experiments live in Composition Lab.")} <Link href="/composition#composition-image">Composition Lab ↗</Link></p>
    : null

  return (
    <section className="color-lab" data-lab="color">
      <header className="cl-title">
        <p className="cl-eyebrow"><a href="https://studio-penumbra.com/#lab">LAB</a><span aria-hidden="true">/</span>{label("색과 빛", "COLOR & LIGHT")}</p>
        <h1>Color <b>Lab</b></h1>
        <p className="cl-lede">{label("이미지에서 팔레트를 만들고, 한 색을 골라 분석부터 명암까지 살펴봅니다.", "Build a palette from an image, then study one color from values to shading.")}</p>
      </header>

      <div className="cl-workspace">
        <section id="color-import" tabIndex={-1} className="cl-card cl-source" aria-labelledby="cl-source-title">
          <header className="cl-card-head">
            <h2 id="cl-source-title" className="cl-label">{label("이미지", "Image")}</h2>
            {hasImage && <div className="cl-head-tools">
              <div className="cl-seg" role="group" aria-label={label("이미지에서 색을 고르는 방식", "How to take colors from the image")}>
                <button type="button" aria-pressed={imageMode === "extract"} onClick={() => setImageMode("extract")}>{label("영역 추출", "Extract")}</button>
                <button type="button" aria-pressed={imageMode === "pick"} onClick={() => setImageMode("pick")}>{label("픽셀 피킹", "Pick a pixel")}</button>
              </div>
              {imageMode === "pick" && <button type="button" className="cl-btn cl-btn-ghost" onClick={clearImage}>{label("이미지 지우기", "Clear image")}</button>}
            </div>}
          </header>
          <div className="image-workbench" style={{ "--cl-stage": `${stageHeight}px` } as CSSProperties}>
            {!store.sourceImageUrl ? <ImageUploader onImageLoad={loadImage} /> : imageMode === "pick" ? <ImagePicker key={store.sourceImageUrl} src={store.sourceImageUrl} onPick={hex => selectColor(hex, undefined, "pixel")} /> : <ImageSelector imageUrl={store.sourceImageUrl} maxHeight={stageHeight} onSelectionComplete={src => { extractionSource.current = src || store.sourceImageUrl; if (extractionSource.current) void runExtraction(extractionSource.current) }} onClear={clearImage} />}
          </div>
          {hasImage && <div className="cl-source-controls">
            {countControl}
            <label className="cl-select"><span>{label("추출 방식", "Method")}</span><select value={store.extractionMethod} onChange={event => changeMethod(event.target.value as "histogram" | "kmeans")}><option value="histogram">{label("색상 분포", "Hue histogram")}</option><option value="kmeans">{label("면적 기반 · K-Means", "Area-based · K-Means")}</option></select></label>
            <span className="cl-status" role="status">{busy ? label("추출 중…", "Extracting…") : label("바꾸면 바로 다시 추출해요", "Re-extracts as you change it")}</span>
          </div>}
        </section>

        <section id="color-edit" tabIndex={-1} className="cl-card cl-palette" aria-labelledby="cl-palette-title">
          <header className="cl-card-head">
            <div className="cl-palette-title">
              <h2 id="cl-palette-title" className="cl-label">{label("팔레트", "Palette")}</h2>
              {colors.length > 0 && <input className="cl-palette-name" aria-label={label("팔레트 이름", "Palette name")} value={palette?.name ?? "Untitled Palette"} onChange={event => { if (palette) store.setCurrentPalette({ ...palette, name: event.target.value }) }} maxLength={80}/>}
              <span className="cl-count" aria-label={label(`${colors.length}색`, `${colors.length} colors`)}>{colors.length}</span>
            </div>
            <div id="color-save" className="cl-palette-actions">
              <Link className="cl-btn cl-btn-ghost" href="/library">{label("라이브러리", "Library")}<ArrowUpRight size={14} aria-hidden="true"/></Link>
              {colors.length > 0 && <>
                <button type="button" className="cl-btn" onClick={() => setExportOpen(true)} title={label("PNG · JSON · CSS · SCSS로 내보내기", "Export as PNG, JSON, CSS or SCSS")}><ArrowDownToLine size={15} aria-hidden="true"/>{label("내보내기", "Export")}</button>
                <button type="button" className="cl-btn cl-btn-primary" onClick={savePalette} title={label("이 브라우저의 라이브러리에 보관", "Keep in this browser's library")}>{label("저장", "Save")}</button>
              </>}
            </div>
          </header>
          {colors.length > 0 ? <>
            <div className="palette-canvas" role="group" aria-label={label("편집할 팔레트 색", "Editable palette colors")}>
              {colors.map((color, index) => <button key={index} type="button" aria-label={`${label("편집할 색 선택", "Select color to edit")} ${index + 1} · ${color.hex}`} aria-pressed={selectedIndex === index && activeHex.toUpperCase() === color.hex.toUpperCase()} onClick={() => selectColor(color.hex, index)}><span className="palette-canvas-color" style={{ background: color.hex }}/><span><b>{String(index + 1).padStart(2, "0")}</b><code>{color.hex}</code></span></button>)}
            </div>
            <div className="cl-palette-edit">
              <PaletteEditor dense colors={colors} selectedIndex={selectedIndex} onSelect={index => selectColor(colors[index].hex, index)} onChange={changeColors} fallbackHex={activeHex}/>
              {colors[selectedIndex] && activeHex.toUpperCase() !== colors[selectedIndex].hex.toUpperCase() && <button type="button" className="cl-btn cl-replace" onClick={() => changeColors(colors.map((color, index) => index === selectedIndex ? makeColor(activeHex) : color), selectedIndex)}><span className="cl-chip-dot" style={{ background: activeHex }} aria-hidden="true"/>{label(`${selectedIndex + 1}번을 현재 색으로 교체`, `Replace ${selectedIndex + 1} with the current color`)}</button>}
            </div>
            <div className="cl-palette-foot">
              <div className="cl-palette-style"><StyleFilter dense currentStyle={store.currentStyle} onStyleChange={style => { requestId.current++; setBusy(false); store.setCurrentStyle(style); const updated = usePaletteStore.getState().currentPalette?.colors[selectedIndex]; if (updated) selectColor(updated.hex, selectedIndex) }} customSettings={store.customSettings} onCustomSettingsChange={settings => { requestId.current++; setBusy(false); store.setCustomSettings(settings); const updated = usePaletteStore.getState().currentPalette?.colors[selectedIndex]; if (updated) selectColor(updated.hex, selectedIndex) }} /></div>
              {!hasImage && countControl}
            </div>
            {store.savedPalettes.length > 0 && <div className="cl-recent">
              <h3 className="cl-label">{label("최근 저장", "Recently saved")}</h3>
              <div className="saved-palette-row">{store.savedPalettes.slice(-4).reverse().map(item => <Link key={item.id} href={`/palette/${item.id}`} className="saved-palette-card"><div>{item.colors.map((color, index) => <span key={index} style={{ background: color.hex }}/>)}</div><p>{item.name}<span>{item.colors.length}</span></p></Link>)}</div>
            </div>}
          </> : <div className="cl-empty-palette" role="status">
            <p>{busy ? label("이미지에서 색을 가져오고 있어요.", "Extracting colors from your image.") : label("아직 팔레트가 비어 있어요.", "Your palette is empty.")}</p>
            <span>{label("이미지에서 색을 뽑거나, 현재 색으로 시작하세요.", "Extract colors from an image, or start with the current color.")}</span>
            <button type="button" className="cl-btn cl-btn-primary" disabled={!ready || busy} onClick={() => addColors([activeHex])}><span className="cl-chip-dot" style={{ backgroundColor: activeHex }} aria-hidden="true"/>{label("현재 색으로 시작", "Start with the current color")}</button>
          </div>}
        </section>

        <aside id="color-explore" tabIndex={-1} className="cl-card cl-current" aria-labelledby="cl-current-title" aria-busy={!ready}>
          <header className="cl-card-head">
            <h2 id="cl-current-title" className="cl-label">{label("현재 색", "Current color")}</h2>
            <span className="cl-meta">{originText}</span>
          </header>
          <input className="cl-current-swatch" type="color" aria-label={label("현재 색 고르기", "Pick the current color")} value={activeHex} onChange={event => selectColor(event.target.value)} />
          <div className="cl-hex-row">
            <form onSubmit={event => { event.preventDefault(); commitHex() }}><label className="sr-only" htmlFor="selected-color-hex">{label("현재 색 HEX", "Current color HEX")}</label><input id="selected-color-hex" className="cl-hex" aria-invalid={hexError} value={hexInput} onChange={event => setHexInput(event.target.value)} onBlur={commitHex} maxLength={7} spellCheck={false} /></form>
            <button type="button" className="cl-icon" onClick={() => void copy(activeHex, "hex")} aria-label={label("HEX 복사", "Copy HEX")} title={label("HEX 복사", "Copy HEX")}>{copied === "hex" ? <Check size={16}/> : <Copy size={16}/>}</button>
          </div>
          {hexError && <p className="cl-error" role="alert">{label("HEX는 #A8B5A2처럼 3자리 또는 6자리로 입력해주세요.", "Enter a 3- or 6-digit HEX, such as #A8B5A2.")}</p>}
          <p className="cl-name"><strong>{current.name}</strong><span>{ta(`family.${hueFamily(current)}`)} · {ta(`temp.${colorTemperature(current)}`)}</span></p>
          <dl className="cl-values">{QUICK_FORMATS.map(format => {
            const value = formatColor(current, format)
            return <div key={format}><dt>{format}</dt><dd><code>{bareValue(value)}</code><button type="button" onClick={() => void copy(value, format)} aria-label={`${format} ${label("복사", "copy")} ${value}`} title={value}>{copied === format ? <Check size={14}/> : <Copy size={14}/>}</button></dd></div>
          })}</dl>
          <div className="cl-round-actions">
            <button type="button" onClick={() => selectColor(randomHex(), undefined, "random")}><span aria-hidden="true"><Shuffle size={18}/></span>{label("랜덤", "Random")}</button>
            {canEyedrop && <button type="button" onClick={eyedrop}><span aria-hidden="true"><Pipette size={18}/></span>{label("스포이트", "Eyedropper")}</button>}
            <button type="button" disabled={!ready || busy} onClick={() => addColors([activeHex])} aria-label={label("현재 색을 팔레트에 추가", "Add the current color to the palette")}><span aria-hidden="true"><Plus size={18}/></span>{label("팔레트에", "To palette")}</button>
            <button type="button" aria-pressed={kept} onClick={() => savedColors.toggle(activeHex)} aria-label={kept ? label("보관한 색에서 빼기", "Remove from kept colors") : label("현재 색 보관", "Keep the current color")}><span aria-hidden="true"><Star size={18} fill={kept ? "currentColor" : "none"}/></span>{kept ? label("보관됨", "Kept") : label("보관", "Keep")}</button>
          </div>
          <div className="cl-kept">
            <h3 className="cl-label">{label("보관한 색", "Kept colors")}</h3>
            {savedColors.colors.length ? <div className="favorite-colors">{savedColors.colors.map(hex => <button key={hex} type="button" title={hex} aria-label={`${label("색 선택", "Select color")} ${hex}`} aria-pressed={hex === activeHex.toUpperCase()} style={{ background: hex }} onClick={() => selectColor(hex)}/>)}</div>
              : <p className="cl-note">{label("보관을 누르면 자주 쓰는 색이 여기에 모여요.", "Colors you keep gather here.")}</p>}
          </div>
        </aside>
      </div>

      <section className="cl-tools" ref={toolsRef} aria-labelledby="cl-tools-title">
        <h2 id="cl-tools-title" className="sr-only">{label("현재 색 도구", "Tools for the current color")}</h2>
        <div className="cl-tabbar">
          <div className="cl-tabs" role="tablist" aria-label={label("도구", "Tools")}>
            {TOOL_TABS.map((item, index) => <button key={item.id} ref={element => { tabRefs.current[item.id] = element }} type="button" role="tab" id={`cl-tab-${item.id}`} aria-selected={tab === item.id} aria-controls={item.panel} tabIndex={tab === item.id ? 0 : -1} onClick={() => openTab(item.id)} onKeyDown={event => onTabKey(event, index)}>{ko ? item.ko : item.en}</button>)}
          </div>
          <label className="cl-current-chip" title={label("현재 색", "Current color")}><input type="color" aria-label={label("현재 색 고르기", "Pick the current color")} value={activeHex} onChange={event => selectColor(event.target.value)}/><code>{activeHex}</code></label>
        </div>
        {TOOL_TABS.map(item => <div key={item.id} id={item.panel} role="tabpanel" aria-labelledby={`cl-tab-${item.id}`} tabIndex={-1} hidden={tab !== item.id} className="cl-panel">
          <p className="cl-panel-note">{ko ? item.koNote : item.enNote}</p>
          {panelContent(item.id)}
          {panelFootnote(item.id)}
        </div>)}
      </section>

      {currentPaletteForExport && <ExportModal open={exportOpen} onOpenChange={setExportOpen} palette={currentPaletteForExport}/>}
    </section>
  )
}
