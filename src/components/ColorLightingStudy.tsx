"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { useLocale } from "next-intl"
import {
  buildColorLightingStudy,
  clampLighting,
  DEFAULT_COLOR_LIGHTING,
  getColorLightingSamples,
  LIGHTING_CAMERA,
  lightingLinearToSrgb,
  sampleColorLighting,
  sampleLightingGround,
  visibleLightingNormal,
  type ColorLightingSettings,
  type ColorLightingStudy as LightingStudy,
  type LightingTemperature,
  type LightingView,
} from "@/lib/colorLightingStudy"
import "./ColorLightingStudy.css"

interface ColorLightingStudyProps {
  hex: string
  onSelectColor: (hex: string) => void
}

function LightingCanvas({ study, view, description }: { study: LightingStudy; view: LightingView; description: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return
    let frame = 0

    const draw = () => {
      const { width: cssWidth, height: cssHeight } = canvas.getBoundingClientRect()
      if (cssWidth <= 0) return
      const width = Math.min(800, Math.max(1, Math.round(cssWidth * Math.min(window.devicePixelRatio || 1, 1.5))))
      const height = Math.max(1, Math.round(cssHeight * width / cssWidth))
      canvas.width = width
      canvas.height = height
      const pixels = context.createImageData(width, height)
      const data = pixels.data
      const radius = Math.min(width * 0.205, height * 0.40)
      const cx = width * 0.5
      const cy = height * 0.45
      const encoding = new Uint8ClampedArray(4097)
      for (let index = 0; index < encoding.length; index++) encoding[index] = Math.round(lightingLinearToSrgb(index / 4096) * 255)
      const encode = (value: number) => encoding[Math.round(clampLighting(value) * 4096)]

      for (let y = 0; y < height; y++) {
        const ny = (cy - y - 0.5) / radius
        const groundZ = (-LIGHTING_CAMERA[2] - ny) / LIGHTING_CAMERA[1]
        // Distant ground fades gently into the studio backdrop; sphere lighting stays linear.
        const floorFade = 0.25 + 0.75 * clampLighting(y / height * 1.5)
        for (let x = 0; x < width; x++) {
          const nx = (x + 0.5 - cx) / radius
          const distance = Math.hypot(nx, ny)
          const coverage = clampLighting((1 - distance) * radius + 0.5)
          const index = (y * width + x) * 4
          let floor: number[]
          if (view === "mask") {
            floor = [0.027 * floorFade, 0.027 * floorFade, 0.027 * floorFade]
          } else {
            floor = sampleLightingGround(study, nx, groundZ).map(channel => channel * floorFade)
          }
          if (coverage > 0) {
            const normal = visibleLightingNormal(nx / Math.max(1, distance), ny / Math.max(1, distance))
            const shaded = sampleColorLighting(study, normal)
            const mask = shaded.directAmount > 0 ? 0.73 : 0.055
            for (let channel = 0; channel < 3; channel++) {
              const surface = view === "mask" ? mask : shaded.linear[channel]
              data[index + channel] = encode(surface * coverage + floor[channel] * (1 - coverage))
            }
          } else {
            for (let channel = 0; channel < 3; channel++) data[index + channel] = encode(floor[channel])
          }
          data[index + 3] = 255
        }
      }
      context.putImageData(pixels, 0, 0)

      // Project the light direction outside the silhouette so its marker cannot
      // be mistaken for a highlight. A head-on light is indicated above the ball.
      if (study.settings.keyEnabled) {
        const light = study.direction
        const screenY = light[1] * LIGHTING_CAMERA[2] - light[2] * LIGHTING_CAMERA[1]
        const projectedLength = Math.hypot(light[0], screenY)
        const lx = cx + (projectedLength > 0.01 ? light[0] / projectedLength : 0) * radius * 1.38
        const ly = cy - (projectedLength > 0.01 ? screenY / projectedLength : 1) * radius * 1.38
        const marker = width / 92
        context.save()
        context.strokeStyle = "#eeeeee"
        context.lineWidth = Math.max(1, width / 420)
        context.globalAlpha = 0.8
        context.beginPath()
        context.arc(lx, Math.max(marker * 3, ly), marker, 0, Math.PI * 2)
        context.stroke()
        for (let ray = 0; ray < 8; ray++) {
          const angle = ray * Math.PI / 4
          context.beginPath()
          context.moveTo(lx + Math.cos(angle) * marker * 1.5, Math.max(marker * 3, ly) + Math.sin(angle) * marker * 1.5)
          context.lineTo(lx + Math.cos(angle) * marker * 2.05, Math.max(marker * 3, ly) + Math.sin(angle) * marker * 2.05)
          context.stroke()
        }
        context.restore()
      }
    }

    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(draw)
    }
    schedule()
    const observer = new ResizeObserver(schedule)
    observer.observe(canvas)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [study, view])

  return <canvas ref={ref} width={492} height={300} className="lighting-study-canvas" role="img" aria-label={description}>{description}</canvas>
}

export function ColorLightingStudy({ hex, onSelectColor }: ColorLightingStudyProps) {
  const ko = useLocale() === "ko"
  const id = useId()
  const [settings, setSettings] = useState<ColorLightingSettings>({ ...DEFAULT_COLOR_LIGHTING })
  const [view, setView] = useState<LightingView>("render")
  const study = useMemo(() => buildColorLightingStudy(hex, settings), [hex, settings])
  const samples = useMemo(() => getColorLightingSamples(study), [study])
  const change = <K extends keyof ColorLightingSettings>(key: K, value: ColorLightingSettings[K]) => setSettings(current => ({ ...current, [key]: value }))
  const text = (korean: string, english: string) => ko ? korean : english
  const temperatureLabel = (temperature: LightingTemperature) => ({ neutral: text("중성", "Neutral"), warm: text("따뜻한 빛", "Warm"), cool: text("차가운 빛", "Cool") })[temperature]
  const description = text(
    `${study.baseHex} 재질의 구체. 광원 좌우 ${settings.azimuth}도, 높이 ${settings.elevation}도. ${settings.keyEnabled ? temperatureLabel(settings.temperature) : "주광원 꺼짐"}. ${view === "mask" ? "흰색은 주광원이 닿는 면, 짙은 회색은 닿지 않는 면입니다." : "빛과 환경에 따른 표면색을 보여줍니다."}`,
    `Sphere with ${study.baseHex} material. Light azimuth ${settings.azimuth} degrees, elevation ${settings.elevation} degrees. ${settings.keyEnabled ? temperatureLabel(settings.temperature) + " key light" : "Key light off"}. ${view === "mask" ? "White receives direct light; dark gray does not." : "Surface colors respond to light and environment."}`,
  )

  return (
    <section id="color-lighting-study" tabIndex={-1} className="color-lighting-study" aria-labelledby={`${id}-title`}>
      <header className="lighting-study-heading">
        <div>
          <h3 id={`${id}-title`}>{text("빛에 따른 표면색", "Surface color under light")}</h3>
          <p>{text("재질색을 기준으로, 빛의 방향과 색에 따른 변화를 관찰하세요.", "Observe how light direction and color change the surface appearance of this material color.")}</p>
        </div>
        <button className="lighting-reset" type="button" onClick={() => { setSettings({ ...DEFAULT_COLOR_LIGHTING }); setView("render") }}>{text("초기화", "Reset")}</button>
      </header>

      <div className="lighting-stage">
        <div className="lighting-view-tabs" role="group" aria-label={text("조명 보기", "Lighting view")}>
          <button type="button" aria-pressed={view === "render"} onClick={() => setView("render")}>{text("표면색", "Surface color")}</button>
          <button type="button" aria-pressed={view === "mask"} onClick={() => setView("mask")}>{text("명부 · 암부", "Light / shadow")}</button>
        </div>
        <LightingCanvas study={study} view={view} description={description} />
        <p className="lighting-stage-caption">
          {view === "mask"
            ? text("흰색 = 직접 빛이 닿는 면 · 회색 = 닿지 않는 면", "White = direct light · Gray = no direct light")
            : !settings.keyEnabled && !settings.ambientEnabled
              ? text("빛이 없으면 표면색도 보이지 않습니다.", "Without light, the surface has no visible color.")
              : text("같은 재질색도 빛과 주변 환경에 따라 달라 보입니다.", "One material color, different light and surroundings.")}
        </p>
      </div>

      <div className="lighting-position-controls">
        <label htmlFor={`${id}-azimuth`}>
          <span>{text("광원 좌우", "Light position")}<output>{settings.azimuth > 0 ? "+" : ""}{settings.azimuth}°</output></span>
          <input id={`${id}-azimuth`} type="range" min={-80} max={80} step={1} value={settings.azimuth}
            onChange={event => change("azimuth", Number(event.target.value))}
            aria-valuetext={`${Math.abs(settings.azimuth)}${text("도", " degrees")} ${settings.azimuth < 0 ? text("왼쪽", "left") : settings.azimuth > 0 ? text("오른쪽", "right") : text("정면", "center")}`} />
        </label>
        <label htmlFor={`${id}-elevation`}>
          <span>{text("광원 높이", "Light elevation")}<output>{settings.elevation}°</output></span>
          <input id={`${id}-elevation`} type="range" min={10} max={80} step={1} value={settings.elevation}
            onChange={event => change("elevation", Number(event.target.value))} aria-valuetext={`${settings.elevation}${text("도", " degrees")}`} />
        </label>
      </div>

      <div className="lighting-temperature-row">
        <span>{text("빛의 색", "Light color")}</span>
        <div className="lighting-choices" role="group" aria-label={text("주광원 색", "Key light color")}>
          {(["neutral", "warm", "cool"] as const).map(temperature => <button key={temperature} type="button" aria-pressed={settings.temperature === temperature}
            onClick={() => change("temperature", temperature)}>{temperatureLabel(temperature)}</button>)}
        </div>
      </div>

      <div className="lighting-environment-row">
        <div className="lighting-toggles">
          <label><input type="checkbox" checked={settings.keyEnabled} onChange={event => change("keyEnabled", event.target.checked)} /><span>{text("주광원", "Key light")}</span></label>
          <label><input type="checkbox" checked={settings.ambientEnabled} onChange={event => change("ambientEnabled", event.target.checked)} /><span>{text("환경 · 반사광", "Ambient / bounce")}</span></label>
          <label><input type="checkbox" checked={settings.specularEnabled} onChange={event => change("specularEnabled", event.target.checked)} /><span>{text("하이라이트", "Highlight")}</span></label>
        </div>
        <label className="lighting-ground" htmlFor={`${id}-ground`}>
          <span>{text("바닥색", "Ground")}</span>
          <input id={`${id}-ground`} type="color" value={settings.groundHex} onChange={event => change("groundHex", event.target.value.toUpperCase())} />
        </label>
      </div>

      <div className="lighting-samples">
        <div className="lighting-base-swatch"><span className="lighting-swatch" style={{ backgroundColor: study.baseHex }} /><span>{text("재질색", "Material")}<code>{study.baseHex}</code></span></div>
        {([{ name: text("밝은 면", "Lit surface"), hex: samples.lit }, { name: text("어두운 면", "Dark surface"), hex: samples.dark }]).map(sample => (
          <button key={sample.name} type="button" onClick={() => onSelectColor(sample.hex)}
            aria-label={`${sample.name} ${sample.hex} · ${text("이 색으로 탐색", "Explore this color")}`} title={text("이 표면색으로 다시 탐색", "Explore from this surface color")}>
            <span className="lighting-swatch" style={{ backgroundColor: sample.hex }} /><span>{sample.name}<code>{sample.hex}</code></span><span className="lighting-sample-arrow" aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      <p className="lighting-model-note"><strong>{text("비금속 조명 모델", "Dielectric lighting model")}</strong>{text(" · 바닥 반사광과 부드러운 그림자는 근사 표현입니다. 표면색 칩을 누르면 그 색으로 탐색합니다.", " · Ground bounce and soft shadows are approximations. Select a surface swatch to explore that color.")}</p>
      <p className="lighting-lab-connection">{text("광량·거리·노출을 비교하려면", "To compare light output, distance and exposure,")} <a href="https://studio-penumbra.com/lighting-lab.html#experiment-panel">{text("Light Lab에서 비교하기 ↗", "continue in Light Lab ↗")}</a></p>
      <details className="lighting-explanation">
        <summary>{text("왜 색이 달라질까요?", "Why does the color change?")}</summary>
        <p>{text("명부는 주광원이 직접 닿는 면입니다. 하이라이트는 빛과 시선의 관계에 따라 이동하는 반사로, 재질색과 별도로 빛의 색을 띱니다. 암부의 색은 환경과 반사광에 따라 달라집니다. 그림자가 항상 파란색인 것은 아닙니다.", "The lit side receives direct light. A highlight is a reflection that moves with the light and viewing direction, taking on the light’s color separately from the material. The dark side depends on ambient light and reflected surroundings; shadows are not always blue.")}</p>
      </details>
    </section>
  )
}
