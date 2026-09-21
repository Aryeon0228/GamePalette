"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useLocale } from "next-intl"
import { useCompositionState, type Guide } from "@/stores/compositionSessionStore"
import { compositionCrop, compositionGuideGeometry, renderCompositionMask } from "@/lib/imageCompositionStudy"
import { compositionLessonSample } from "@/lib/compositionLessonSample"
import "./ImageCompositionStudy.css"

type Source = { key: string; canvas: HTMLCanvasElement; aspect: number } | null

export function ImageCompositionStudy({ imageUrl, onImageLoad }: { imageUrl: string | null; onImageLoad: (url: string) => void }) {
  const ko = useLocale() === "ko"
  const t = (kr: string, en: string) => ko ? kr : en
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const fileRead = useRef<{ generation: number; reader: FileReader | null }>({ generation: 0, reader: null })
  const [sampleFor, setSampleFor] = useCompositionState("sampleFor")
  const useSample = !imageUrl || sampleFor === imageUrl
  const sourceKey = useSample ? "sample" : imageUrl!
  const previousSourceKey = useRef(sourceKey)
  const [source, setSource] = useState<Source>(null)
  const [loadError, setLoadError] = useState(false)
  const [fileError, setFileError] = useState("")
  const [retry, setRetry] = useState(0)
  const [ratio, setRatio] = useCompositionState("ratio")
  const [panX, setPanX] = useCompositionState("panX")
  const [panY, setPanY] = useCompositionState("panY")
  const [threshold, setThreshold] = useCompositionState("threshold")
  const [inverted, setInverted] = useCompositionState("inverted")
  const [original, setOriginal] = useCompositionState("original")
  const [guides, setGuides] = useCompositionState("guides")
  const [opacity, setOpacity] = useCompositionState("opacity")
  const [rotation, setRotation] = useCompositionState("rotation")
  const [flipped, setFlipped] = useCompositionState("flipped")
  const [scale, setScale] = useCompositionState("scale")
  const [offsetX, setOffsetX] = useCompositionState("offsetX")
  const [offsetY, setOffsetY] = useCompositionState("offsetY")
  const [darkArea, setDarkArea] = useState<number | null>(null)
  const activeSource = source?.key === sourceKey ? source.canvas : null
  const measuredArea = activeSource ? darkArea : null
  const originalAspect = activeSource && source ? source.aspect : 1.5
  const aspect = ratio === "original" ? originalAspect : Number(ratio)
  // Bound both axes, including unusually narrow uploaded textures.
  const width = Math.max(1, Math.round(Math.min(800, 500 * aspect)))
  const height = Math.min(500, Math.max(1, Math.round(width / aspect)))
  const visibleRatio = aspect
  const guideNames = { thirds: t("삼분할", "Thirds"), golden: t("황금 분할", "Golden grid"), diagonals: t("대각선", "Diagonals"), spiral: t("황금 나선", "Golden spiral") }
  const previewLabel = original ? t("원본 색", "Original color") : `${t("흑백 경계", "Threshold")} ${threshold}`
  const geometries = useMemo(() => guides.map(kind => ({ kind, ...compositionGuideGeometry(kind) })), [guides])

  useEffect(() => { if (!imageUrl) setSampleFor(null) }, [imageUrl, setSampleFor])
  useEffect(() => {
    const pending = fileRead.current
    return () => { pending.generation++; pending.reader?.abort() }
  }, [])

  useEffect(() => {
    let cancelled = false
    let image: HTMLImageElement | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined
    setSource(null); setLoadError(false); setDarkArea(null)
    // Rebuild the canvas on remount, but retain the crop for the same source.
    if (previousSourceKey.current !== sourceKey) { setPanX(0); setPanY(0) }
    previousSourceKey.current = sourceKey
    const fail = () => { if (!cancelled) setLoadError(true); cancelled = true; if (timeout) clearTimeout(timeout) }
    if (useSample) setSource({ key: sourceKey, canvas: compositionLessonSample(), aspect: 1.5 })
    else {
      image = new Image(); image.crossOrigin = "anonymous"
      image.onload = () => {
        if (cancelled || !image) return
        try {
          const factor = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight))
          const canvas = document.createElement("canvas")
          canvas.width = Math.max(1, Math.round(image.naturalWidth * factor))
          canvas.height = Math.max(1, Math.round(image.naturalHeight * factor))
          const ctx = canvas.getContext("2d")!
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
          ctx.getImageData(0, 0, 1, 1) // Detect a blocked cross-origin image before controls become active.
          setSource({ key: sourceKey, canvas, aspect: image.naturalWidth / image.naturalHeight }); clearTimeout(timeout)
        } catch { fail() }
      }
      image.onerror = fail
      timeout = setTimeout(fail, 15000)
      image.src = sourceKey
    }
    return () => { cancelled = true; clearTimeout(timeout); if (image) { image.onload = null; image.onerror = null; image.removeAttribute("src") } }
  }, [sourceKey, useSample, retry, setPanX, setPanY])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !activeSource) return
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!
    canvas.width = width; canvas.height = height
    // Crop in natural-image proportions before converting to sampled pixels.
    // Integer raster dimensions must not crop or distort a very narrow source.
    const { sx, sy, sw, sh } = compositionCrop(originalAspect, 1, visibleRatio, panX, panY)
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(activeSource, sx / originalAspect * activeSource.width, sy * activeSource.height, sw / originalAspect * activeSource.width, sh * activeSource.height, 0, 0, width, height)
    const pixels = ctx.getImageData(0, 0, width, height)
    const mask = renderCompositionMask(pixels.data, threshold, inverted)
    let black = 0
    for (let i = 0; i < mask.length; i += 4) if (mask[i] === 0) black++
    setDarkArea(black / (width * height) * 100)
    if (!original) { pixels.data.set(mask); ctx.putImageData(pixels, 0, 0) }
  }, [activeSource, originalAspect, width, height, visibleRatio, panX, panY, threshold, inverted, original])

  const reset = () => { setRatio("original"); setPanX(0); setPanY(0); setThreshold(128); setInverted(false); setOriginal(false); setGuides(["thirds"]); setOpacity(85); setRotation(0); setFlipped(false); setScale(100); setOffsetX(0); setOffsetY(0) }
  const range = (name: string, value: number, change: (n: number) => void, min: number, max: number, unit = "") => <label className="ics-range"><span>{name}<output>{value}{unit}</output></span><input type="range" aria-label={name} min={min} max={max} value={value} onChange={e => change(Number(e.target.value))}/></label>

  return <div className="image-composition-study">
    <div className="ics-toolbar">
      <div className="ics-source"><span>{useSample ? t("구도 예시", "Composition sample") : t("내 이미지 · 구도 미리보기", "My image · framing preview")}</span>
        {imageUrl && <div className="ics-buttons" role="group" aria-label={t("구도 실습 이미지", "Composition source")}><button type="button" aria-pressed={!useSample} onClick={() => setSampleFor(null)}>{t("내 이미지", "My image")}</button><button type="button" aria-pressed={useSample} onClick={() => setSampleFor(imageUrl)}>{t("구도 예시", "Sample")}</button></div>}
      </div>
      <div className="ics-buttons"><button type="button" onClick={() => fileRef.current?.click()}>{t("이미지 열기", "Open image")}</button><button type="button" onClick={reset}>{t("구도 실습 초기화", "Reset composition")}</button></div>
      <input ref={fileRef} className="sr-only" tabIndex={-1} type="file" accept="image/*" aria-label={t("구도 실습용 이미지 파일", "Image file for composition")} onChange={e => {
        const file = e.target.files?.[0]; e.target.value = ""
        if (!file) return
        fileRead.current.generation++
        fileRead.current.reader?.abort()
        const generation = fileRead.current.generation
        if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) { setFileError(t("10MB 이하의 이미지 파일을 선택해주세요.", "Choose an image file under 10MB.")); return }
        setFileError("")
        const reader = new FileReader()
        fileRead.current.reader = reader
        reader.onload = () => { if (generation !== fileRead.current.generation) return; setSampleFor(null); onImageLoad(String(reader.result)) }
        reader.onerror = () => { if (generation === fileRead.current.generation) setFileError(t("파일을 읽지 못했어요. 다시 선택해주세요.", "Could not read the file. Please try again.")) }
        reader.readAsDataURL(file)
      }}/>
    </div>
    {fileError && <p role="alert">{fileError}</p>}
    <div className="ics-layout">
      <div className="ics-visual">
        <div className="ics-preview-toolbar"><div className="ics-buttons" role="group" aria-label={t("구도 미리보기", "Composition preview")}><button type="button" aria-pressed={!original} onClick={() => setOriginal(false)}>{t("흑백 2단계", "Two-tone mask")}</button><button type="button" aria-pressed={original} onClick={() => setOriginal(true)}>{t("원본 색", "Original color")}</button></div><span>{activeSource ? `${t("화면 비율", "Frame ratio")} ${aspect.toFixed(2)}:1` : "—"}</span></div>
        <div className="ics-stage" aria-busy={!activeSource && !loadError}>
          {activeSource ? <div className="ics-frame" style={{ width: `min(100%, calc(var(--ics-frame-height) * ${aspect}))`, aspectRatio: visibleRatio }}>
            <canvas ref={canvasRef} role="img" aria-label={`${t("구도 미리보기", "Composition preview")} · ${previewLabel}`} />
            <div className="ics-guides" aria-hidden="true" style={{ opacity: opacity / 100 }}>
              {geometries.map(geometry => <svg key={geometry.kind} viewBox={geometry.viewBox} preserveAspectRatio={geometry.preserveAspectRatio} className={`ics-guide ics-guide-${geometry.kind}`} style={geometry.kind === "spiral" ? { transform: `translate(${offsetX}%, ${offsetY}%) rotate(${rotation}deg) scale(${(flipped ? -1 : 1) * scale / 100}, ${scale / 100})` } : undefined}>
                {geometry.paths.map((d, i) => <g key={i}><path d={d} className="ics-guide-shadow" vectorEffect="non-scaling-stroke"/><path d={d} className="ics-guide-line" vectorEffect="non-scaling-stroke"/></g>)}
              </svg>)}
            </div>
          </div> : <div className="ics-load" role="status">{loadError ? <>{t("이미지를 읽지 못했어요.", "Could not read this image.")} <button type="button" onClick={() => setRetry(n => n + 1)}>{t("다시 시도", "Retry")}</button></> : t("이미지를 읽는 중…", "Reading image…")}</div>}
        </div>
        <div className="ics-area"><span>{t("현재 프레임의 흑백 면적", "Mask areas in this frame")}</span><span>{t("검정", "Black")} <b>{measuredArea === null ? "—" : `${measuredArea.toFixed(1)}%`}</b> · {t("흰색", "White")} <b>{measuredArea === null ? "—" : `${(100 - measuredArea).toFixed(1)}%`}</b></span></div>
        <p className="ics-note">{t("구도 선은 정답이 아닌 비교 도구예요. 큰 덩어리, 여백, 시선이 모이는 위치를 관찰하세요.", "Guides help comparison, not grading. Look at large shapes, negative space, and the focal point.")}</p>
      </div>
      <div className="ics-controls">
        <fieldset><legend>{t("01 / 흑백 덩어리", "01 / Value masses")}</legend>
          {range(t("흑백 경계 · Threshold", "Threshold"), threshold, setThreshold, 0, 255)}
          <div className="ics-buttons"><button type="button" aria-pressed={inverted} onClick={() => setInverted(v => !v)}>{t("흑백 반전", "Invert mask")}</button></div>
          <p>{t("경계보다 어두운 픽셀을 검정으로 묶습니다. 자동 피사체 분리와는 달라요.", "Pixels below the boundary form the dark mass. This is not automatic subject segmentation.")}</p>
        </fieldset>
        <fieldset><legend>{t("02 / 화면 비율", "02 / Frame ratio")}</legend>
          <div className="ics-buttons ics-ratios" role="group" aria-label={t("화면 비율", "Frame ratio")}>{[["original", t("원본", "Original")], ["1", "1:1"], [String(4 / 3), "4:3"], ["1.5", "3:2"], [String(16 / 9), "16:9"], [String(9 / 16), "9:16"], [String((1 + Math.sqrt(5)) / 2), "φ:1"]].map(([value, name]) => <button type="button" key={value} aria-pressed={ratio === value} onClick={() => { setRatio(value); setPanX(0); setPanY(0) }}>{name}</button>)}</div>
          {ratio !== "original" && activeSource && <div>{originalAspect > aspect + 0.0001 ? range(t("크롭 위치 좌우", "Horizontal crop position"), panX, setPanX, -100, 100) : originalAspect < aspect - 0.0001 ? range(t("크롭 위치 상하", "Vertical crop position"), panY, setPanY, -100, 100) : null}</div>}
          <p>{t("비율을 바꿔 다른 프레임을 비교하세요. 원본 파일은 그대로 유지됩니다.", "Change the ratio to compare frames. Your original file stays unchanged.")}</p>
        </fieldset>
        <fieldset><legend>{t("03 / 구도 가이드", "03 / Composition guides")}</legend>
          <div className="ics-buttons ics-guide-choices" role="group" aria-label={t("겹쳐 볼 구도 가이드", "Guide layers")}>{(Object.keys(guideNames) as Guide[]).map(kind => <button type="button" key={kind} aria-pressed={guides.includes(kind)} onClick={() => setGuides(current => current.includes(kind) ? current.filter(g => g !== kind) : [...current, kind])}>{guideNames[kind]}</button>)}<button type="button" aria-pressed={!guides.length} onClick={() => setGuides([])}>{t("선 끄기", "Hide guides")}</button></div>
          {range(t("가이드 불투명도", "Guide opacity"), opacity, setOpacity, 0, 100, "%")}
          {guides.includes("spiral") && <div className="ics-spiral-controls"><div className="ics-buttons"><button type="button" onClick={() => setRotation(v => (v + 90) % 360)}>{t("나선 회전", "Rotate spiral")} {rotation}°</button><button type="button" aria-pressed={flipped} onClick={() => setFlipped(v => !v)}>{t("나선 뒤집기", "Mirror spiral")}</button></div>{range(t("나선 크기", "Spiral scale"), scale, setScale, 50, 180, "%")}<div className="ics-pair">{range(t("나선 좌우", "Spiral horizontal"), offsetX, setOffsetX, -50, 50)}{range(t("나선 상하", "Spiral vertical"), offsetY, setOffsetY, -50, 50)}</div></div>}
        </fieldset>
      </div>
    </div>
    <details className="ics-explanation"><summary>{t("실루엣과 구도를 함께 읽는 법", "Reading silhouette and composition")}</summary><div>
      <p>{t("실루엣은 외곽만 보고도 형태·포즈·방향이 읽히는가의 문제입니다. 이 실습의 명도 마스크는 밝기로 나눈 덩어리라서 배경이나 내부 그림자도 함께 묶일 수 있어요. 외곽을 정확히 보려면 배경과 분리된 이미지도 함께 비교하세요.", "A silhouette tests whether the outline communicates form, pose, and direction. A value mask groups brightness, so backgrounds and interior shadows may merge. Compare an isolated subject to judge its actual outline.")}</p>
      <p>{t("삼분할 선은 가로·세로의 1/3과 2/3, 황금 분할은 약 38.2%와 61.8%입니다. 황금 나선은 90°마다 반지름이 약 1.618배 커지는 곡선이며, 화면 비율에 맞춰 찌그러뜨리지 않습니다. 나선의 중심과 흐름을 옮기며 비교하세요.", "Thirds divide the frame at 1/3 and 2/3; the golden grid uses about 38.2% and 61.8%. The golden spiral grows in radius by about 1.618 per 90°. Its shape stays undistorted; move its center and flow to compare.")}</p>
      <p>{t("도타 2 아트 가이드의 관찰 포인트: 작은 크기에서도 알아볼 수 있는 외곽, 큰 명도 덩어리, 시선이 모이는 대비, 디테일 사이의 쉼. 특정 비율에 맞는다는 이유만으로 좋은 구도가 되는 것은 아닙니다.", "Observation prompts from the Dota 2 art guide: a readable outline at small scale, large value groups, contrast hierarchy, and quiet spaces between details. Matching a ratio alone does not make a successful composition.")}</p>
      <p>{t("흑백은 선형 sRGB 휘도에서 계산하며, 투명 영역은 흰 배경에 합성합니다. 면적은 현재 잘린 프레임의 축소 미리보기 기준입니다. 이미지는 이 브라우저에서 처리하며 서버로 보내지 않습니다.", "The mask uses linear-sRGB luminance, with transparency composited over white. Areas are measured in the reduced, cropped preview. Images are processed in your browser and are not uploaded to a server.")}</p>
    </div></details>
  </div>
}
