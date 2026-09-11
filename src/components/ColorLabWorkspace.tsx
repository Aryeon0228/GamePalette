"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { ArrowDownToLine, ArrowUpRight, Check, Copy, Pipette, Plus } from "lucide-react"
import { ImageUploader } from "@/components/ImageUploader"
import { ImageSelector } from "@/components/ImageSelector"
import { ImagePicker } from "@/components/ImagePicker"
import { ColorLabTools } from "@/components/ColorLabTools"
import { PaletteEditor } from "@/components/PaletteEditor"
import { StyleFilter } from "@/components/StyleFilter"
import { ExportModal } from "@/components/ExportModal"
import { HistogramSection } from "@/components/HistogramSection"
import { ColorSphereStudy } from "@/components/ColorSphereStudy"
import { AsciiStudy } from "@/components/AsciiStudy"
import { usePaletteStore } from "@/stores/paletteStore"
import { useSavedColors } from "@/stores/savedColorsStore"
import { useToast } from "@/components/ui/toast"
import { extractColors, analyzeLuminosityHistogram, type LuminosityHistogram } from "@/lib/colorExtractor"
import { applyColorBlindnessToColors, type ColorBlindnessType } from "@/lib/colorVision"
import { toGrayscale } from "@/lib/styleFilters"
import { copyToClipboard, generateId, getColorName, hexToRgb, rgbToHsl } from "@/lib/utils"
import type { Color } from "@/types"
import "@/app/color-lab.css"

type Category = "import" | "edit" | "compose" | "analyze" | "save"
const categories = [
  { id: "import", ko: "색 가져오기", en: "Import colors", sub: "PICK & EXTRACT" },
  { id: "edit", ko: "팔레트 편집", en: "Edit palette", sub: "EDIT & ARRANGE" },
  { id: "compose", ko: "배색 · 셰이딩", en: "Compose & shade", sub: "COMPOSE & SHADE" },
  { id: "analyze", ko: "분석 · 검증", en: "Analyze & check", sub: "ANALYZE & CHECK" },
  { id: "save", ko: "보관 · 내보내기", en: "Save & export", sub: "SAVE & EXPORT" },
] as const
const starter = ["#A8B5A2", "#DAD1BA", "#B5785D", "#536A7B", "#303843"]

function makeColor(hex: string): Color {
  const rgb = hexToRgb(hex)
  return { hex: hex.toUpperCase(), rgb, hsl: rgbToHsl(rgb.r, rgb.g, rgb.b), name: getColorName(hex) }
}

export function ColorLabWorkspace() {
  const ko = useLocale() === "ko"
  const label = (kr: string, en: string) => ko ? kr : en
  const store = usePaletteStore()
  const savedColors = useSavedColors()
  const { addToast } = useToast()
  const [activeHex, setActiveHex] = useState(starter[0])
  const [hexInput, setHexInput] = useState(starter[0])
  const [hexError, setHexError] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [imageMode, setImageMode] = useState<"extract" | "pick">("extract")
  const [histogram, setHistogram] = useState<LuminosityHistogram | null>(null)
  const [canEyedrop, setCanEyedrop] = useState(false)
  const extractionSource = useRef<string | null>(null)
  const requestId = useRef(0)
  const initialized = useRef(false)
  const colors = store.currentPalette?.colors ?? []
  const palette = store.currentPalette

  useEffect(() => {
    setCanEyedrop("EyeDropper" in window)
    const hydrate = () => {
      if (initialized.current) return
      initialized.current = true
      const url = new URL(window.location.href)
      const isNew = url.searchParams.get("new") === "1"
      const state = usePaletteStore.getState()
      if (isNew) {
        state.resetCurrentPalette()
        url.searchParams.delete("new")
        window.history.replaceState(window.history.state, "", url.toString())
      }
      if (!state.currentPalette || isNew) {
        const now = new Date().toISOString()
        const initial = starter.map(makeColor)
        state.setCurrentPalette({ id: generateId(), name: "Untitled Palette", colors: initial, style: "original", tags: [], createdAt: now, updatedAt: now })
        state.updateColors(initial)
      }
      const first = usePaletteStore.getState().currentPalette?.colors[0]?.hex ?? starter[0]
      setActiveHex(first)
      setHexInput(first)
      extractionSource.current = usePaletteStore.getState().sourceImageUrl
    }
    if (usePaletteStore.persist.hasHydrated()) hydrate()
    const stop = usePaletteStore.persist.onFinishHydration(hydrate)
    const pendingRequest = requestId
    return () => { stop(); pendingRequest.current++ }
  }, [])

  useEffect(() => {
    setHexInput(activeHex)
    setHexError(false)
  }, [activeHex])

  useEffect(() => {
    if (!store.sourceImageUrl) { setHistogram(null); return }
    let cancelled = false
    analyzeLuminosityHistogram(store.sourceImageUrl).then(result => { if (!cancelled) setHistogram(result) }).catch(() => { if (!cancelled) setHistogram(null) })
    return () => { cancelled = true }
  }, [store.sourceImageUrl])

  const jumpTo = (next: Category) => {
    const target = document.getElementById(`color-${next}`)
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: "start" })
  }

  const selectColor = (hex: string, index?: number) => {
    setActiveHex(hex.toUpperCase())
    if (index !== undefined) setSelectedIndex(index)
  }

  const changeColors = (next: Color[], index: number) => {
    requestId.current++
    setBusy(false)
    store.updateColors(next)
    const safeIndex = Math.max(0, Math.min(index, next.length - 1))
    setSelectedIndex(safeIndex)
    if (next[safeIndex]) selectColor(next[safeIndex].hex)
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
    selectColor(`#${value}`)
    setHexInput(`#${value.toUpperCase()}`)
    setHexError(false)
  }

  const copy = async () => {
    try { await copyToClipboard(activeHex); setCopied(true); setTimeout(() => setCopied(false), 1500) }
    catch { addToast(label("색상 코드를 직접 선택해 복사해주세요.", "Select the HEX value to copy it manually."), "error") }
  }

  const eyedrop = async () => {
    const Picker = (window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper
    if (!Picker) return
    try { selectColor((await new Picker().open()).sRGBHex) } catch { /* Escape cancels picking. */ }
  }

  const runExtraction = useCallback(async (src: string, count?: number, method?: "histogram" | "kmeans") => {
    const id = ++requestId.current
    setBusy(true)
    try {
      const state = usePaletteStore.getState()
      const extracted = await extractColors(src, count ?? state.colorCount, method ?? state.extractionMethod)
      if (id !== requestId.current) return
      state.setOriginalColors(extracted)
      const first = usePaletteStore.getState().currentPalette?.colors[0]
      if (first) { setActiveHex(first.hex); setSelectedIndex(0) }
    } catch {
      if (id === requestId.current) addToast(ko ? "이미지에서 색을 추출하지 못했어요. 다른 이미지를 시도해주세요." : "Could not extract colors. Try another image.", "error")
    } finally { if (id === requestId.current) setBusy(false) }
  }, [addToast, ko])

  const loadImage = (url: string) => {
    store.setSourceImageUrl(url)
    extractionSource.current = url
    void runExtraction(url)
  }

  const changeCount = (count: number) => {
    store.setColorCount(count)
    if (extractionSource.current) void runExtraction(extractionSource.current, count)
  }

  const savePalette = () => {
    if (!palette) return
    try {
      const existing = store.savedPalettes.find(item => item.id === palette.id)
      if (existing) store.updatePalette(palette.id, { ...palette, sourceImageUrl: store.sourceImageUrl || palette.sourceImageUrl })
      else store.savePalette(palette.name)
      addToast(label("라이브러리에 팔레트를 저장했어요.", "Palette saved to your library."), "success")
    } catch { addToast(label("저장 공간이 부족해요. 파일로 내보내기를 이용해주세요.", "Storage is full. Export your palette as a file."), "error") }
  }

  const visionColors = applyColorBlindnessToColors(colors, store.colorBlindMode)
  const previewColors = store.valueCheckEnabled ? toGrayscale(visionColors) : visionColors
  const currentPaletteForExport = palette ? { ...palette, sourceImageUrl: store.sourceImageUrl || palette.sourceImageUrl } : null

  return (
    <section className="color-lab color-overview">
      <div className="color-lab-heading">
        <div className="overview-title"><p className="lab-eyebrow"><a href="https://studio-penumbra.com/#work">WORK</a><span>/</span>WEB 05</p><h1>Color <b>Lab</b></h1></div>
        <p className="heading-note">{label("하나의 색에서, 전체 팔레트까지.", "From a single color to a complete palette.")}</p>
      </div>

      <div className="color-context" aria-label={label("탐색 색과 작업 팔레트", "Explore color and working palette")}>
        <div className="color-context-row">
          <span className="context-label">{label("탐색 색", "EXPLORE")}</span>
          <input type="color" aria-label={label("현재 색 고르기", "Pick current color")} value={activeHex} onChange={event => selectColor(event.target.value)} />
          <form onSubmit={event => { event.preventDefault(); commitHex() }}><input className="hex-input" aria-label={label("현재 색 HEX", "Current color HEX")} aria-invalid={hexError} value={hexInput} onChange={event => setHexInput(event.target.value)} onBlur={commitHex} maxLength={7} spellCheck={false} /></form>
          <button className="lab-icon-button" onClick={copy} aria-label={label("현재 색 복사", "Copy current color")}>{copied ? <Check size={14} /> : <Copy size={14} />}</button>
          <button className="lab-button add-color" onClick={() => addColors([activeHex])} aria-label={label("탐색 색을 팔레트에 추가", "Add explored color to palette")}><Plus size={13} />{label("추가", "Add")}</button>
          <div className="context-palette" aria-label={label("작업 팔레트의 색 선택", "Select a working palette color")}>
            {colors.map((color,index) => <button key={index} style={{background:color.hex}} title={color.hex} aria-label={`${label("색 선택", "Select color")} ${index + 1}: ${color.hex}`} aria-pressed={activeHex.toUpperCase() === color.hex.toUpperCase()} onClick={() => selectColor(color.hex,index)}><span>{String(index+1).padStart(2,"0")}</span></button>)}
          </div>
          <button className="lab-button context-export" aria-label={label("내보내기", "Export")} onClick={() => setExportOpen(true)}><ArrowDownToLine size={14} /><span>{label("내보내기", "Export")}</span></button>
        </div>
        {hexError && <p className="hex-error" role="alert">{label("HEX는 #A8B5A2처럼 3자리 또는 6자리로 입력해주세요.", "Enter a 3- or 6-digit HEX, such as #A8B5A2.")}</p>}
        <nav className="overview-jumps" aria-label={label("페이지 내 도구 바로가기", "Jump to tools on this page")}>
          {categories.map((item,index) => <a key={item.id} href={`#color-${item.id}`}><span>0{index+1}</span>{ko ? item.ko : item.en}</a>)}
        </nav>
      </div>

      <div className="overview-start">
        <section id="color-import" tabIndex={-1} className="overview-panel source-panel">
          <div className="overview-section-heading"><h2><span>01</span>{label("색 가져오기", "Import colors")}</h2><div className="inline-actions">{canEyedrop && <button className="lab-text-button" onClick={eyedrop}><Pipette size={13} />{label("화면 피킹", "Screen picker")}</button>}<button className="lab-text-button" onClick={() => selectColor(`#${Math.floor(Math.random()*16777216).toString(16).padStart(6,"0")}`)}>{label("랜덤", "Random")}</button></div></div>
          <div className="source-body">
            <div className="image-workbench">
              {!store.sourceImageUrl ? <ImageUploader onImageLoad={loadImage} /> : imageMode === "pick" ? <ImagePicker key={store.sourceImageUrl} src={store.sourceImageUrl} onPick={selectColor} /> : <ImageSelector imageUrl={store.sourceImageUrl} maxHeight={190} onSelectionComplete={src => { extractionSource.current=src || store.sourceImageUrl; if(extractionSource.current) void runExtraction(extractionSource.current) }} onClear={() => {requestId.current++;setBusy(false);store.setSourceImageUrl(null);extractionSource.current=null}} />}
            </div>
            <div className="extraction-controls">
              {store.sourceImageUrl && <div className="lab-segment"><button aria-pressed={imageMode === "extract"} onClick={() => setImageMode("extract")}>{label("영역 추출", "Extract region")}</button><button aria-pressed={imageMode === "pick"} onClick={() => setImageMode("pick")}>{label("픽셀 피킹", "Pick a pixel")}</button></div>}
              <label className="extraction-count" htmlFor="extract-count">{label("색 수", "Colors")}<input id="extract-count" type="range" min={3} max={32} value={store.colorCount} onChange={event => changeCount(Number(event.target.value))}/><output>{store.colorCount}</output></label>
              <select aria-label={label("추출 방식", "Extraction method")} value={store.extractionMethod} onChange={event => {const method=event.target.value as "histogram"|"kmeans";store.setExtractionMethod(method);if(extractionSource.current)void runExtraction(extractionSource.current,undefined,method)}}><option value="histogram">{label("색상 분포", "Hue histogram")}</option><option value="kmeans">K-Means</option></select>
              <span className="lab-help extraction-status" role="status">{busy ? label("추출 중…", "Extracting…") : label("설정 변경 시 자동 추출", "Automatically re-extracts")}</span>
            </div>
          </div>
        </section>

        <section id="color-edit" tabIndex={-1} className="overview-panel edit-panel">
          <div className="overview-section-heading"><h2><span>02</span>{label("팔레트 편집", "Edit palette")}</h2><input className="palette-name-input" aria-label={label("팔레트 이름", "Palette name")} value={palette?.name ?? "Untitled Palette"} onChange={event=>{if(palette)store.setCurrentPalette({...palette,name:event.target.value})}} maxLength={80}/></div>
          <div className="palette-canvas">{colors.map((color,index)=><button key={index} aria-label={`${label("편집할 색 선택", "Select color to edit")} ${index+1}`} aria-pressed={selectedIndex===index} onClick={()=>selectColor(color.hex,index)}><span className="palette-canvas-color" style={{background:color.hex}}/><span><b>{String(index+1).padStart(2,"0")}</b><code>{color.hex}</code></span></button>)}</div>
          <div className="overview-editor"><PaletteEditor dense colors={colors} selectedIndex={selectedIndex} onSelect={index=>selectColor(colors[index].hex,index)} onChange={changeColors} fallbackHex={activeHex}/>{colors[selectedIndex] && activeHex.toUpperCase()!==colors[selectedIndex].hex.toUpperCase() && <button className="lab-text-button replace-color" onClick={()=>changeColors(colors.map((color,index)=>index===selectedIndex?makeColor(activeHex):color),selectedIndex)}>{label(`팔레트 ${selectedIndex+1}번을 탐색 색으로 교체`, `Replace palette color ${selectedIndex+1} with explored color`)} <span style={{background:activeHex}}/></button>}</div>
          <div className="style-section"><StyleFilter dense currentStyle={store.currentStyle} onStyleChange={style=>{requestId.current++;setBusy(false);store.setCurrentStyle(style);const updated=usePaletteStore.getState().currentPalette?.colors[selectedIndex];if(updated)selectColor(updated.hex)}} customSettings={store.customSettings} onCustomSettingsChange={settings=>{requestId.current++;setBusy(false);store.setCustomSettings(settings);const updated=usePaletteStore.getState().currentPalette?.colors[selectedIndex];if(updated)selectColor(updated.hex)}} /></div>
        </section>
      </div>

      <section id="color-compose" tabIndex={-1} className="overview-section">
        <div className="overview-section-heading"><h2><span>03</span>{label("배색 · 셰이딩", "Compose & shade")}</h2><p>{label("탐색 색을 기준으로 함께 바뀝니다. 색상칩을 눌러 다음 색을 골라보세요.", "All combinations follow your explored color. Select a swatch to explore it.")}</p></div>
        <ColorLabTools overview hex={activeHex} mode="compose" onSelectColor={selectColor} onAddColors={addColors} extraCard={<ColorSphereStudy hex={activeHex} onSelectColor={selectColor} />} />
        <details className="ascii-details"><summary>{label("아스키 아트", "ASCII art")}<span>{label("이미지를 문자와 팔레트 색으로 변환", "Turn an image into colored characters")}</span></summary><div><AsciiStudy imageUrl={store.sourceImageUrl} palette={palette} onImport={()=>jumpTo("import")} /></div></details>
      </section>

      <section id="color-analyze" tabIndex={-1} className="overview-section">
        <div className="overview-section-heading"><h2><span>04</span>{label("분석 · 검증", "Analyze & check")}</h2><p>{label("색상 값, 대비, 색각 결과를 나란히 비교하세요.", "Compare color values, contrast, and color vision side by side.")}</p></div>
        <ColorLabTools overview hex={activeHex} mode="analyze" onSelectColor={selectColor}/>
        <div className="palette-inspection">
          <div className="inspection-preview"><div className="inspection-heading"><h3>{label("팔레트 검사", "Palette check")}</h3><button className="lab-button" aria-pressed={store.valueCheckEnabled} onClick={store.toggleValueCheck}>{label("흑백", "Grayscale")}</button><select aria-label={label("팔레트 색각 시뮬레이션", "Palette color vision simulation")} value={store.colorBlindMode} onChange={event=>store.setColorBlindMode(event.target.value as ColorBlindnessType)}>{[["none",label("정상","Normal")],["protanopia",label("적색맹","Protanopia")],["deuteranopia",label("녹색맹","Deuteranopia")],["tritanopia",label("청색맹","Tritanopia")]].map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></div><div className="analysis-palette">{previewColors.map((color,index)=><div key={index} style={{background:color.hex}} title={colors[index].hex}/>)}</div><p className="lab-help">{label("검사 결과는 미리보기에만 적용됩니다.", "Checks affect this preview only.")}</p></div>
          {histogram ? <div className="compact-histogram"><HistogramSection histogram={histogram}/></div> : <p className="histogram-empty">{label("이미지를 가져오면 명도 분포도 이곳에 표시됩니다.", "Import an image to see its brightness distribution here.")}</p>}
        </div>
      </section>

      <section id="color-save" tabIndex={-1} className="overview-section save-overview">
        <div className="overview-section-heading"><h2><span>05</span>{label("보관 · 내보내기", "Save & export")}</h2><div className="inline-actions"><button className="lab-button primary" onClick={savePalette}>{label("라이브러리에 저장", "Save to library")}</button><button className="lab-button" onClick={()=>setExportOpen(true)}><ArrowDownToLine size={14}/>{label("파일 · 코드 내보내기", "Export files & code")}</button><Link className="lab-text-button" href="/library">{label("라이브러리", "Library")}<ArrowUpRight size={13}/></Link></div></div>
        <div className="save-overview-content"><div className="saved-palette-row">{store.savedPalettes.length ? store.savedPalettes.slice(-4).reverse().map(item=><Link key={item.id} href={`/palette/${item.id}`} className="saved-palette-card"><div>{item.colors.map((color,index)=><span key={index} style={{background:color.hex}}/>)}</div><p>{item.name}<span>{item.colors.length}</span></p></Link>) : <p className="lab-help">{label("완성한 팔레트를 이 브라우저에 보관하세요. PNG · JSON · CSS · SCSS로 가져갈 수 있어요.", "Keep palettes in this browser, or export PNG, JSON, CSS and SCSS.")}</p>}</div><div className="favorites-area"><div className="favorites-heading"><h3>{label("즐겨찾는 단색", "Favorite colors")}</h3><button className="lab-text-button" onClick={()=>savedColors.add(activeHex)}><Plus size={13}/>{label("탐색 색 보관", "Keep explored color")}</button></div><div className="favorite-colors">{savedColors.colors.map(hex=><button key={hex} title={hex} aria-label={`${label("색 선택","Select color")} ${hex}`} style={{background:hex}} onClick={()=>selectColor(hex)}/>)}</div></div></div>
      </section>
      {currentPaletteForExport && <ExportModal open={exportOpen} onOpenChange={setExportOpen} palette={currentPaletteForExport}/>}
    </section>
  )
}
