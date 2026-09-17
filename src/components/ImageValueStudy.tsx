"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { useLocale } from "next-intl"
import {
  analyzeImageValues, DEFAULT_VALUE_THRESHOLDS, measureValueAreas, renderValuePreview, valueStudySize,
  type ImageValueAnalysis, type ValueBand, type ValuePreviewMode,
} from "@/lib/imageValueStudy"
import "./ImageValueStudy.css"

interface StudyFrame {
  pixels: ImageData
  analysis: ImageValueAnalysis
}

type StudyLoad =
  | { key: string; status: "loading" | "error" }
  | { key: string; status: "ready"; frame: StudyFrame }

/** A local teaching illustration, independent of the user's image and palette. */
function drawLessonSample(context: CanvasRenderingContext2D) {
  context.fillStyle = "#e9dec7"
  context.fillRect(0, 0, 360, 240)
  context.fillStyle = "#d2bb98"
  context.fillRect(0, 151, 360, 89)
  context.fillStyle = "#877a6d"
  context.beginPath()
  context.ellipse(166, 190, 132, 21, -0.09, 0, Math.PI * 2)
  context.fill()
  const sphere = context.createRadialGradient(98, 92, 3, 134, 122, 64)
  sphere.addColorStop(0, "#ffd899")
  sphere.addColorStop(0.35, "#dc966b")
  sphere.addColorStop(0.75, "#a44e43")
  sphere.addColorStop(1, "#492f36")
  context.fillStyle = sphere
  context.beginPath()
  context.arc(120, 126, 62, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = "#b6c1aa"
  context.beginPath()
  context.moveTo(205, 75)
  context.lineTo(268, 66)
  context.lineTo(304, 94)
  context.lineTo(238, 107)
  context.closePath()
  context.fill()
  context.fillStyle = "#57675d"
  context.beginPath()
  context.moveTo(205, 75)
  context.lineTo(238, 107)
  context.lineTo(238, 187)
  context.lineTo(205, 157)
  context.closePath()
  context.fill()
  context.fillStyle = "#354941"
  context.beginPath()
  context.moveTo(238, 107)
  context.lineTo(304, 94)
  context.lineTo(304, 170)
  context.lineTo(238, 187)
  context.closePath()
  context.fill()
  context.fillStyle = "#f8edcc"
  context.beginPath()
  context.ellipse(199, 191, 24, 13, 0, 0, Math.PI * 2)
  context.fill()
}

function makeFrame(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): StudyFrame {
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  return { pixels, analysis: analyzeImageValues(pixels.data) }
}

export function ImageValueStudy({ imageUrl }: { imageUrl: string | null }) {
  const ko = useLocale() === "ko"
  const label = (kr: string, en: string) => ko ? kr : en
  const id = useId()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Tying the sample preference to one URL lets a newly uploaded image take over.
  const [sampleForImage, setSampleForImage] = useState<string | null | undefined>(undefined)
  const useSample = !imageUrl || sampleForImage === imageUrl
  const sourceKey = useSample ? "lesson-sample" : imageUrl!
  const [attempt, setAttempt] = useState(0)
  const [load, setLoad] = useState<StudyLoad>({ key: "", status: "loading" })
  const [mode, setMode] = useState<ValuePreviewMode>("tones")
  const [lower, setLower] = useState<number>(DEFAULT_VALUE_THRESHOLDS[0])
  const [upper, setUpper] = useState<number>(DEFAULT_VALUE_THRESHOLDS[1])
  const [selectedBand, setSelectedBand] = useState<ValueBand | null>(null)
  const currentLoad = load.key === sourceKey ? load : null
  const frame = currentLoad?.status === "ready" ? currentLoad.frame : null
  const areas = useMemo(() => frame ? measureValueAreas(frame.analysis, lower, upper) : null, [frame, lower, upper])
  const canMeasure = Boolean(frame?.analysis.opaquePixelCount)

  useEffect(() => {
    if (!imageUrl) setSampleForImage(undefined)
  }, [imageUrl])

  useEffect(() => {
    let cancelled = false
    let pendingImage: HTMLImageElement | null = null
    let timeout: ReturnType<typeof setTimeout> | undefined
    setSelectedBand(null)
    setLoad({ key: sourceKey, status: "loading" })
    const fail = () => {
      if (!cancelled) setLoad({ key: sourceKey, status: "error" })
      cancelled = true
      if (timeout) clearTimeout(timeout)
    }
    const complete = (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
      if (cancelled) return
      try {
        const nextFrame = makeFrame(canvas, context)
        if (!cancelled) setLoad({ key: sourceKey, status: "ready", frame: nextFrame })
        if (timeout) clearTimeout(timeout)
      } catch { fail() }
    }
    try {
      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d", { willReadFrequently: true })
      if (!context) throw new Error("Canvas unavailable")
      if (useSample) {
        canvas.width = 360
        canvas.height = 240
        drawLessonSample(context)
        complete(canvas, context)
      } else {
        pendingImage = new Image()
        pendingImage.crossOrigin = "anonymous"
        pendingImage.onload = () => {
          if (cancelled || !pendingImage) return
          try {
            const size = valueStudySize(pendingImage.naturalWidth, pendingImage.naturalHeight)
            canvas.width = size.width
            canvas.height = size.height
            context.drawImage(pendingImage, 0, 0, size.width, size.height)
            complete(canvas, context)
          } catch { fail() }
        }
        pendingImage.onerror = fail
        timeout = setTimeout(fail, 15000)
        pendingImage.src = sourceKey
      }
    } catch { fail() }
    return () => {
      cancelled = true
      if (timeout) clearTimeout(timeout)
      if (pendingImage) {
        pendingImage.onload = null
        pendingImage.onerror = null
        pendingImage.removeAttribute("src")
      }
    }
  }, [sourceKey, useSample, attempt])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !frame) return
    const context = canvas.getContext("2d")
    if (!context) return
    canvas.width = frame.pixels.width
    canvas.height = frame.pixels.height
    const output = context.createImageData(canvas.width, canvas.height)
    output.data.set(renderValuePreview(frame.pixels.data, frame.analysis, mode, lower, upper, selectedBand))
    context.putImageData(output, 0, 0)
  }, [frame, mode, lower, upper, selectedBand])

  const bands = [label("어두움", "Dark"), label("중간", "Mid"), label("밝음", "Light")]
  const modes: { value: ValuePreviewMode; text: string }[] = [
    { value: "original", text: label("원본", "Original") },
    { value: "grayscale", text: label("흑백", "Grayscale") },
    { value: "tones", text: label("3단계", "3 tones") },
  ]
  const percentage = (value: number) => value > 0 && value < 0.1 ? "<0.1%" : `${value.toFixed(1)}%`
  const reset = () => {
    setLower(DEFAULT_VALUE_THRESHOLDS[0])
    setUpper(DEFAULT_VALUE_THRESHOLDS[1])
    setMode("tones")
    setSelectedBand(null)
  }

  return (
    <section className="image-value-study" aria-labelledby={`${id}-heading`}>
      <div className="ivs-heading">
        <h3 id={`${id}-heading`}>{label("명도 · 면적 실험", "Value & area study")}</h3>
        <button type="button" className="ivs-reset" onClick={reset}>{label("초기화", "Reset")}</button>
      </div>
      <div className="ivs-source-row">
        <span>{useSample ? label("수업 예시 · 팔레트와 별개", "Lesson sample · separate from palette") : label("내 이미지 전체 · 추출 영역과 별개", "Whole image · independent of extraction crop")}</span>
        {imageUrl && <div className="ivs-switch" role="group" aria-label={label("실험 이미지", "Study image")}>
          <button type="button" aria-pressed={!useSample} onClick={() => setSampleForImage(undefined)}>{label("내 이미지", "My image")}</button>
          <button type="button" aria-pressed={useSample} onClick={() => setSampleForImage(imageUrl)}>{label("예시로 실험", "Try sample")}</button>
        </div>}
      </div>
      <p className="ivs-hint">{label("경계를 움직여 밝고 어두운 영역이 어디에, 얼마나 분포하는지 확인하세요.", "Move the boundaries to see where light and dark areas occur and how much of the image they occupy.")}</p>
      <div className="ivs-layout">
        <div className="ivs-image-side">
          <div className="ivs-switch ivs-preview-modes" role="group" aria-label={label("명도 미리보기 방식", "Value preview mode")}>
            {modes.map(item => <button key={item.value} type="button" aria-pressed={mode === item.value} onClick={() => { setMode(item.value); setSelectedBand(null) }}>{item.text}</button>)}
          </div>
          <div className="ivs-preview" aria-busy={!currentLoad || currentLoad.status === "loading"}>
            {frame ? <canvas ref={canvasRef} role="img" aria-label={`${useSample ? label("수업 예시", "Lesson sample") : label("전체 이미지", "Whole image")} · ${selectedBand === null ? modes.find(item => item.value === mode)?.text : `${bands[selectedBand]} ${label("영역 강조", "area highlighted")}`}`} />
              : currentLoad?.status === "error" ? <div className="ivs-message" role="status"><p>{label("이미지를 읽지 못했어요. 다시 시도하거나 예시로 실험해보세요.", "Could not read the image. Retry or try the lesson sample.")}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>{label("다시 시도", "Retry")}</button></div>
                : <div className="ivs-message" role="status">{label("이미지를 읽는 중…", "Reading image…")}</div>}
          </div>
        </div>
        <div className="ivs-controls">
          <div className="ivs-scale-label"><span>{label("흑백 밝기 경계", "Grayscale boundaries")}</span><span>0–255</span></div>
          <label className="ivs-threshold" htmlFor={`${id}-lower`}>
            <span>{label("어두움 / 중간", "Dark / mid")}<output htmlFor={`${id}-lower`}>{lower}</output></span>
            <input id={`${id}-lower`} type="range" min={1} max={254} step={1} value={lower} disabled={!canMeasure} onChange={event => setLower(Math.min(upper - 1, Math.max(1, Number(event.target.value))))} />
          </label>
          <label className="ivs-threshold" htmlFor={`${id}-upper`}>
            <span>{label("중간 / 밝음", "Mid / light")}<output htmlFor={`${id}-upper`}>{upper}</output></span>
            <input id={`${id}-upper`} type="range" min={2} max={255} step={1} value={upper} disabled={!canMeasure} onChange={event => setUpper(Math.max(lower + 1, Math.min(255, Number(event.target.value))))} />
          </label>
          <p className="ivs-selection-note" role="status">{frame && !canMeasure
            ? label("불투명도 50% 이상인 픽셀이 없어요. 다른 이미지나 수업 예시를 사용해보세요.", "No pixels at 50% opacity or above. Try another image or the lesson sample.")
            : selectedBand === null ? label("아래 면적을 누르면 해당 영역이 원래 색으로 표시됩니다.", "Select an area below to reveal its original colors.")
              : `${bands[selectedBand]} ${label("영역을 원래 색으로 강조했어요. 한 번 더 누르면 해제됩니다.", "area shown in original colors. Select again to clear.")}`}</p>
        </div>
      </div>
      <div className="ivs-areas" role="group" aria-label={label("명도별 면적과 영역 강조", "Value areas and highlights")}>
        {bands.map((band, index) => <button key={index} type="button" disabled={!canMeasure} aria-pressed={selectedBand === index} aria-label={`${band} ${areas && canMeasure ? percentage(areas.percentages[index]) : "—"} · ${label("영역 강조", "highlight area")}`} onClick={() => setSelectedBand(selectedBand === index ? null : index as ValueBand)}>
          <span className={`ivs-band-dot ivs-band-${index}`} aria-hidden="true" /><span>{band}</span><strong>{areas && canMeasure ? percentage(areas.percentages[index]) : "—"}</strong>
        </button>)}
      </div>
      <div className="ivs-area-bar" aria-hidden="true">{areas && canMeasure && areas.percentages.map((value, index) => <span key={index} className={`ivs-band-${index}`} style={{ width: `${value}%` }} />)}</div>
      <details className="ivs-explanation">
        <summary>{label("명도를 읽는 방법", "How to read value")}</summary>
        <p>{label("명도는 색의 밝고 어두운 관계예요. 흑백으로 보면 색상에 가려진 큰 덩어리가 보입니다. 3단계는 두 경계로 나눈 진단용 표현이며, 명암의 물리적 원인을 구분하지는 않아요.", "Value describes light–dark relationships. Grayscale reveals large shapes that hue can hide. The three-tone view groups brightness; it does not identify the physical causes of shading.")}</p>
        <p>{label("0은 검정, 255는 흰색입니다. 경계값부터 다음 단계에 포함돼요. 면적은 전체 이미지를 최대 384px로 축소한 추정치이며 불투명도 50% 미만은 제외합니다. 미리보기만 바뀌고 이미지와 팔레트는 그대로입니다.", "0 is black; 255 is white. Each boundary belongs to the next band. Areas are estimates from the whole image reduced to at most 384px, excluding pixels below 50% opacity. These controls change only this preview.")}</p>
      </details>
    </section>
  )
}
