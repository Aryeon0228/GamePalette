"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { ArrowDownToLine, ArrowUpRight, Check, Copy, Eye, ImagePlus, Layers, Pipette, Plus, SlidersHorizontal, Sparkles } from "lucide-react"
import { ImageUploader } from "@/components/ImageUploader"
import { ImageSelector } from "@/components/ImageSelector"
import { ImagePicker } from "@/components/ImagePicker"
import { ColorLabTools } from "@/components/ColorLabTools"
import { PaletteEditor } from "@/components/PaletteEditor"
import { StyleFilter } from "@/components/StyleFilter"
import { ExportModal } from "@/components/ExportModal"
import { HistogramSection } from "@/components/HistogramSection"
import { SphereShadingPreview } from "@/components/SphereShadingPreview"
import { AsciiStudy } from "@/components/AsciiStudy"
import { usePaletteStore } from "@/stores/paletteStore"
import { useSavedColors } from "@/stores/savedColorsStore"
import { useToast } from "@/components/ui/toast"
import { extractColors, analyzeLuminosityHistogram, type LuminosityHistogram } from "@/lib/colorExtractor"
import { buildShadingScheme } from "@/lib/exporters"
import { applyColorBlindnessToColors, type ColorBlindnessType } from "@/lib/colorVision"
import { toGrayscale } from "@/lib/styleFilters"
import { copyToClipboard, generateId, getColorName, hexToRgb, rgbToHsl } from "@/lib/utils"
import type { Color } from "@/types"
import "@/app/color-lab.css"

type Category = "import" | "edit" | "compose" | "analyze" | "save"
const categories = [
  { id: "import", ko: "색 가져오기", en: "Import colors", sub: "PICK & EXTRACT", icon: ImagePlus },
  { id: "edit", ko: "팔레트 편집", en: "Edit palette", sub: "EDIT & ARRANGE", icon: SlidersHorizontal },
  { id: "compose", ko: "배색 · 셰이딩", en: "Compose & shade", sub: "COMPOSE & SHADE", icon: Sparkles },
  { id: "analyze", ko: "분석 · 검증", en: "Analyze & check", sub: "ANALYZE & CHECK", icon: Eye },
  { id: "save", ko: "보관 · 내보내기", en: "Save & export", sub: "SAVE & EXPORT", icon: ArrowDownToLine },
] as const
const starter = ["#A8B5A2", "#DAD1BA", "#B5785D", "#536A7B", "#303843"]

function makeColor(hex: string): Color {
  const rgb = hexToRgb(hex)
  return { hex: hex.toUpperCase(), rgb, hsl: rgbToHsl(rgb.r, rgb.g, rgb.b), name: getColorName(hex) }
}

export function ColorLabWorkspace({ initialCategory = "import" }: { initialCategory?: Category }) {
  const ko = useLocale() === "ko"
  const label = (kr: string, en: string) => ko ? kr : en
  const store = usePaletteStore()
  const savedColors = useSavedColors()
  const { addToast } = useToast()
  const [category, setCategory] = useState<Category>(initialCategory)
  const [activeHex, setActiveHex] = useState(starter[0])
  const [hexInput, setHexInput] = useState(starter[0])
  const [hexError, setHexError] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [imageMode, setImageMode] = useState<"extract" | "pick">("extract")
  const [study, setStudy] = useState<"colors" | "sphere" | "ascii">("colors")
  const [analysis, setAnalysis] = useState<"color" | "palette">("color")
  const [histogram, setHistogram] = useState<LuminosityHistogram | null>(null)
  const [canEyedrop, setCanEyedrop] = useState(false)
  const extractionSource = useRef<string | null>(null)
  const requestId = useRef(0)
  const initialized = useRef(false)
  const taskRef = useRef<HTMLDivElement>(null)
  const colors = store.currentPalette?.colors ?? []
  const current = categories.find(item => item.id === category)!
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

  const switchCategory = (next: Category) => {
    setCategory(next)
    if (next === "edit" && colors[selectedIndex]) setActiveHex(colors[selectedIndex].hex)
    requestAnimationFrame(() => {
      const task = taskRef.current
      const top = document.querySelector(".color-context")?.getBoundingClientRect().bottom ?? 0
      if (task && task.getBoundingClientRect().top < top) task.scrollIntoView({ block: "start" })
    })
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
    <section className="color-lab">
      <div className="color-lab-heading">
        <div><p className="lab-eyebrow"><a href="https://studio-penumbra.com/#work">WORK</a><span>/</span>WEB 05</p><h1>Color <b>Lab</b></h1><p>{label("색을 발견하고, 조합하고, 쓰임을 확인하세요.", "Discover colors, compose a palette, and see how it works.")}</p></div>
        <span className="lab-signature">PIXEL PAW / COLOR WORKSPACE</span>
      </div>

      <div className="color-context" aria-label={label("현재 색과 작업 팔레트", "Current color and working palette")}>
        <div className="color-context-row">
          <span className="lab-eyebrow context-label">CURRENT COLOR</span>
          <input type="color" aria-label={label("현재 색 고르기", "Pick current color")} value={activeHex} onChange={event => selectColor(event.target.value)} />
          <form onSubmit={event => { event.preventDefault(); commitHex() }}>
            <input className="hex-input" aria-label={label("현재 색 HEX", "Current color HEX")} aria-invalid={hexError} value={hexInput} onChange={event => setHexInput(event.target.value)} onBlur={commitHex} maxLength={7} spellCheck={false} />
          </form>
          <button className="lab-icon-button" onClick={copy} aria-label={label("현재 색 복사", "Copy current color")}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
          <span className="color-name">{getColorName(activeHex)}</span>
          <button className="lab-button add-color" onClick={() => addColors([activeHex])}><Plus size={14} />{label("팔레트에 추가", "Add to palette")}</button>
          <div className="palette-name-field"><label className="lab-eyebrow" htmlFor="palette-name">PALETTE</label><input id="palette-name" value={palette?.name ?? "Untitled Palette"} onChange={event => { if (palette) store.setCurrentPalette({ ...palette, name: event.target.value }) }} maxLength={80} /></div>
        </div>
        {hexError && <p className="hex-error" role="alert">{label("HEX는 #A8B5A2처럼 3자리 또는 6자리로 입력해주세요.", "Enter a 3- or 6-digit HEX, such as #A8B5A2.")}</p>}
        <div className="context-palette" aria-label={label("작업 팔레트의 색 선택", "Select a working palette color")}>
          {colors.map((color, index) => <button key={index} style={{ background: color.hex }} aria-label={`${label("색 선택", "Select color")} ${index + 1}: ${color.hex}`} aria-pressed={activeHex.toUpperCase() === color.hex.toUpperCase()} onClick={() => selectColor(color.hex, index)}><span className="palette-chip-label">{String(index + 1).padStart(2, "0")}<span>{color.hex}</span></span></button>)}
        </div>
      </div>

      <div className="color-workspace">
        <nav className="color-rail" aria-label={label("색상 작업 카테고리", "Color workspace categories")}>
          <p className="lab-eyebrow rail-label">WORKSPACE</p>
          {categories.map((item, index) => <button key={item.id} aria-current={category === item.id ? "page" : undefined} onClick={() => switchCategory(item.id)}><span className="category-number">0{index + 1}</span><span><strong>{ko ? item.ko : item.en}</strong><small>{item.sub}</small></span></button>)}
          <div className="rail-footnote"><span className="live-dot" />{label("브라우저에서 작업 중", "Working in your browser")}<p>{label("색상칩을 눌러 선택하고, 복사 버튼으로 가져가세요.", "Select a swatch. Use Copy to take its value.")}</p></div>
        </nav>

        <div className="color-task" ref={taskRef}>
          <div className="task-heading"><div><p className="lab-eyebrow">{current.sub}</p><h2>{ko ? current.ko : current.en}</h2></div><span className="task-index">0{categories.findIndex(item => item.id === category) + 1} / 05</span></div>

          <div hidden={category !== "import"}><div className="task-columns">
            <div className="task-main">
              <div className="lab-section-head"><h3>{label("이미지에서 시작하기", "Start from an image")}</h3>{store.sourceImageUrl && <div className="lab-segment"><button aria-pressed={imageMode === "extract"} onClick={() => setImageMode("extract")}>{label("팔레트 추출", "Extract")}</button><button aria-pressed={imageMode === "pick"} onClick={() => setImageMode("pick")}>{label("픽셀 피킹", "Pick a pixel")}</button></div>}</div>
              <div className="image-workbench">
                {!store.sourceImageUrl ? <ImageUploader onImageLoad={loadImage} /> : imageMode === "pick" ? <ImagePicker key={store.sourceImageUrl} src={store.sourceImageUrl} onPick={selectColor} /> : <ImageSelector imageUrl={store.sourceImageUrl} onSelectionComplete={src => { extractionSource.current = src || store.sourceImageUrl; if (extractionSource.current) void runExtraction(extractionSource.current) }} onClear={() => { requestId.current++; setBusy(false); store.setSourceImageUrl(null); extractionSource.current = null }} />}
              </div>
              <p className="lab-help" role="status">{busy ? label("이미지의 색을 추출하고 있어요…", "Extracting image colors…") : store.sourceImageUrl ? label("추출된 색은 위 작업 팔레트에 반영됩니다. 픽셀 피킹으로 한 색만 고를 수도 있어요.", "Extracted colors appear in your working palette. Switch to pixel picking to sample a single color.") : label("이미지를 올리거나, 오른쪽에서 직접 색을 골라 시작하세요.", "Upload an image, or start by choosing a color on the right.")}</p>
              <button className="lab-text-button" onClick={() => switchCategory("edit")}>{label("팔레트 편집으로", "Edit the palette")} <ArrowUpRight size={14} /></button>
            </div>
            <aside className="lab-inspector">
              <section><p className="lab-eyebrow">01 / INPUT</p><h3>{label("직접 색 고르기", "Choose a color")}</h3><div className="direct-color" style={{ background: activeHex }}><span>{activeHex}</span></div><div className="inspector-actions">{canEyedrop && <button className="lab-button" onClick={eyedrop}><Pipette size={14} />{label("화면에서 추출", "Screen picker")}</button>}<button className="lab-button" onClick={() => selectColor(`#${Math.floor(Math.random() * 16777216).toString(16).padStart(6, "0")}`)}>{label("랜덤 색", "Random color")}</button></div><p className="lab-help">{label("상단 색상칩이나 HEX 입력으로도 고를 수 있어요.", "You can also use the color swatch or HEX input above.")}</p></section>
              <section><p className="lab-eyebrow">02 / EXTRACTION</p><h3>{label("이미지 추출 설정", "Extraction settings")}</h3><label className="range-label" htmlFor="extract-count">{label("추출할 색상", "Number of colors")}<output>{store.colorCount}</output></label><input id="extract-count" type="range" min={3} max={32} value={store.colorCount} onChange={event => changeCount(Number(event.target.value))} /><div className="range-limits"><span>3</span><span>32</span></div><details className="lab-details"><summary>{label("추출 방식", "Extraction method")}</summary><div className="lab-segment">{(["histogram", "kmeans"] as const).map(method => <button key={method} aria-pressed={store.extractionMethod === method} onClick={() => { store.setExtractionMethod(method); if (extractionSource.current) void runExtraction(extractionSource.current, undefined, method) }}>{method === "histogram" ? label("색상 분포", "Hue histogram") : "K-Means"}</button>)}</div><p className="lab-help">{label("색상 분포는 다양한 색을, K-Means는 대표적인 색을 찾습니다. 설정 변경 시 자동으로 다시 추출해요.", "Hue histogram favors variety; K-Means finds representative colors. Changes automatically re-extract the palette.")}</p></details></section>
            </aside>
          </div></div>

          {category === "edit" && <div className="task-columns"><div className="task-main"><div className="lab-section-head"><h3>{label("작업 팔레트", "Working palette")}</h3><span className="lab-eyebrow">{colors.length} COLORS</span></div><div className="palette-canvas">{colors.map((color, index) => <button key={index} aria-label={`${label("편집할 색 선택", "Select color to edit")} ${index + 1}`} aria-pressed={selectedIndex === index} onClick={() => selectColor(color.hex, index)}><span className="palette-canvas-color" style={{ background: color.hex }} /><span><b>{String(index + 1).padStart(2, "0")}</b><code>{color.hex}</code></span></button>)}</div><section className="style-section"><StyleFilter currentStyle={store.currentStyle} onStyleChange={style => { store.setCurrentStyle(style); const updated = usePaletteStore.getState().currentPalette?.colors[selectedIndex]; if (updated) selectColor(updated.hex) }} customSettings={store.customSettings} onCustomSettingsChange={settings => { store.setCustomSettings(settings); const updated = usePaletteStore.getState().currentPalette?.colors[selectedIndex]; if (updated) selectColor(updated.hex) }} /></section></div><aside className="lab-inspector"><p className="lab-eyebrow">SELECTED COLOR / {String(selectedIndex + 1).padStart(2, "0")}</p><PaletteEditor compact colors={colors} selectedIndex={selectedIndex} onSelect={index => selectColor(colors[index].hex, index)} onChange={changeColors} fallbackHex={activeHex} /></aside></div>}

          {category === "compose" && <><div className="lab-mode-tabs"><button aria-pressed={study === "colors"} onClick={() => setStudy("colors")}>{label("색 조합", "Color combinations")}</button><button aria-pressed={study === "sphere"} onClick={() => setStudy("sphere")}>{label("구체 셰이딩", "Sphere shading")}</button><button aria-pressed={study === "ascii"} onClick={() => setStudy("ascii")}>{label("아스키 아트", "ASCII art")}</button></div>{study === "colors" ? <ColorLabTools hex={activeHex} mode="compose" onSelectColor={selectColor} onAddColors={addColors} /> : study === "sphere" && palette ? <div className="sphere-study"><SphereShadingPreview scheme={buildShadingScheme(palette)} className="sphere-study-preview" /><div><p className="lab-eyebrow">PALETTE IN CONTEXT</p><h3>{label("팔레트로 빛과 그림자 만들기", "Light and shade from your palette")}</h3><p className="lab-help">{label("작업 팔레트에서 밝기와 색에 맞춰 각 역할을 배정한 미리보기입니다.", "A preview assigning roles from the brightness and hue of your working palette.")}</p>{Object.entries(buildShadingScheme(palette)).filter(([,v]) => typeof v === "object" && v && "hex" in v).map(([key, value]) => { const swatch = value as { hex: string }; return <button key={key} className="sphere-role" onClick={() => selectColor(swatch.hex)}><span style={{ background: swatch.hex }} /><span>{({ specular: label("스페큘러", "Specular"), midtone: label("미드톤", "Midtone"), shadow: label("그림자", "Shadow"), rim: label("역광", "Rim light"), background: label("배경", "Background") } as Record<string,string>)[key] || key}</span><code>{swatch.hex}</code></button> })}</div></div> : <AsciiStudy imageUrl={store.sourceImageUrl} palette={palette} onImport={() => switchCategory("import")} />}</>}

          {category === "analyze" && <><div className="lab-mode-tabs"><button aria-pressed={analysis === "color"} onClick={() => setAnalysis("color")}>{label("선택한 색", "Selected color")}</button><button aria-pressed={analysis === "palette"} onClick={() => setAnalysis("palette")}>{label("팔레트 · 이미지", "Palette & image")}</button></div>{analysis === "color" ? <ColorLabTools hex={activeHex} mode="analyze" onSelectColor={selectColor} /> : <div className="task-columns"><div className="task-main"><div className="analysis-palette">{previewColors.map((color,index) => <div key={index} style={{ background: color.hex }}><span>{colors[index].hex}</span></div>)}</div><p className="lab-help">{label("검사 미리보기입니다. 저장·내보내기에는 원래 팔레트 색을 사용합니다.", "This is a simulation. Saving and exporting use the original palette colors.")}</p>{histogram ? <HistogramSection histogram={histogram} /> : <div className="lab-empty"><Layers size={24} /><p>{label("이미지를 가져오면 명도 분포도 확인할 수 있어요.", "Import an image to inspect its brightness distribution.")}</p><button className="lab-button" onClick={() => switchCategory("import")}>{label("이미지 가져오기", "Import image")}</button></div>}</div><aside className="lab-inspector"><section><h3>{label("명도 확인", "Value check")}</h3><button className="lab-button" aria-pressed={store.valueCheckEnabled} onClick={store.toggleValueCheck}>{store.valueCheckEnabled ? label("흑백 보기 켜짐", "Grayscale on") : label("흑백 보기 꺼짐", "Grayscale off")}</button></section><section><label htmlFor="vision-mode">{label("색각 시뮬레이션", "Color vision simulation")}</label><select id="vision-mode" value={store.colorBlindMode} onChange={event => store.setColorBlindMode(event.target.value as ColorBlindnessType)}>{[["none",label("정상", "Normal")],["protanopia",label("적색맹", "Protanopia")],["deuteranopia",label("녹색맹", "Deuteranopia")],["tritanopia",label("청색맹", "Tritanopia")]].map(([value,text]) => <option key={value} value={value}>{text}</option>)}</select></section></aside></div>}</>}

          {category === "save" && <div className="task-columns"><div className="task-main"><section className="save-section"><div className="lab-section-head"><div><p className="lab-eyebrow">LIBRARY</p><h3>{label("저장한 팔레트", "Saved palettes")}</h3></div><Link className="lab-text-button" href="/library">{label("라이브러리 관리", "Manage library")}<ArrowUpRight size={14} /></Link></div>{store.savedPalettes.length ? <div className="saved-palette-grid">{store.savedPalettes.slice().reverse().map(item => <Link key={item.id} href={`/palette/${item.id}`} className="saved-palette-card"><div>{item.colors.map((color,index) => <span key={index} style={{ background: color.hex }} />)}</div><p>{item.name}<span>{item.colors.length} COLORS <ArrowUpRight size={13} /></span></p></Link>)}</div> : <div className="lab-empty"><Layers size={24} /><p>{label("완성한 팔레트를 저장하면 여기서 다시 열 수 있어요.", "Save a finished palette to open it here later.")}</p></div>}</section><section className="save-section"><div className="lab-section-head"><h3>{label("즐겨찾는 단색", "Favorite colors")}</h3><button className="lab-text-button" onClick={() => savedColors.add(activeHex)}><Plus size={14} />{label("현재 색 보관", "Keep current color")}</button></div><div className="favorite-colors">{savedColors.colors.map(hex => <button key={hex} onClick={() => selectColor(hex)} aria-label={`${label("색 선택", "Select color")} ${hex}`}><span style={{ background: hex }} /><code>{hex}</code></button>)}</div>{!savedColors.colors.length && <p className="lab-help">{label("이전에 홈에서 저장했던 단색도 이곳에 함께 표시됩니다.", "Colors previously saved on the home page also appear here.")}</p>}</section></div><aside className="lab-inspector"><section><p className="lab-eyebrow">SAVE YOUR WORK</p><label className="save-name-label" htmlFor="saved-palette-name">{label("팔레트 이름", "Palette name")}</label><input id="saved-palette-name" className="save-name-input" value={palette?.name ?? ""} onChange={event => { if (palette) store.setCurrentPalette({ ...palette, name: event.target.value }) }} maxLength={80} /><p className="lab-help">{label("이름을 정한 뒤 라이브러리에 저장하세요.", "Name your palette, then save it to the library.")}</p><button className="lab-button primary" onClick={savePalette}>{label("라이브러리에 저장", "Save to library")}</button><p className="lab-help">{label("이 브라우저에 저장됩니다. 다른 기기에서는 내보낸 파일을 이용하세요.", "Saved in this browser. Export a file to use it on another device.")}</p></section><section><h3>{label("프로젝트로 가져가기", "Take it to your project")}</h3><p className="lab-help">PNG · JSON · CSS · SCSS</p><button className="lab-button" onClick={() => setExportOpen(true)}><ArrowDownToLine size={14} />{label("파일 · 코드 내보내기", "Export files & code")}</button></section></aside></div>}
        </div>
      </div>
      {currentPaletteForExport && <ExportModal open={exportOpen} onOpenChange={setExportOpen} palette={currentPaletteForExport} />}
    </section>
  )
}
