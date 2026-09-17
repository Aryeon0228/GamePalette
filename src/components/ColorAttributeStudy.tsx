"use client"

import { useEffect, useId, useMemo, useState } from "react"
import { useLocale } from "next-intl"
import { ArrowRight, RotateCcw } from "lucide-react"
import { colorFromHex } from "@/lib/colorAnalysis"
import { attributeColor, luminanceGray, preciseStudyHsl, type StudyHsl } from "@/lib/colorAttributeStudy"
import { relativeLuminance } from "@/lib/utils"
import "./ColorAttributeStudy.css"

export function ColorAttributeStudy({ hex, onSelectColor }: { hex: string; onSelectColor: (hex: string) => void }) {
  const ko = useLocale() === "ko"
  const t = (kr: string, en: string) => ko ? kr : en
  const id = useId()
  const base = useMemo(() => colorFromHex(hex), [hex])
  const referenceHsl = useMemo(() => preciseStudyHsl(base.hex), [base.hex])
  const [hsl, setHsl] = useState<StudyHsl>(referenceHsl)
  const [changed, setChanged] = useState(false)
  const [backgrounds, setBackgrounds] = useState(["#202020", "#E5E5E5"])
  const [connected, setConnected] = useState(false)
  const [gray, setGray] = useState(false)

  useEffect(() => { setHsl(referenceHsl); setChanged(false) }, [referenceHsl])
  // An untouched picked color must remain exact despite rounded HSL metadata.
  const result = changed ? attributeColor(hsl) : base.hex
  const display = gray ? luminanceGray(result) : result
  const axes = [
    { key: "h" as const, name: t("색상", "Hue"), max: 360, unit: "°", track: `linear-gradient(90deg, ${Array.from({ length: 7 }, (_, n) => `hsl(${n * 60} 85% 55%)`).join(",")})` },
    { key: "s" as const, name: t("채도", "Saturation"), max: 100, unit: "%", track: `linear-gradient(90deg,hsl(${hsl.h} 0% ${hsl.l}%),hsl(${hsl.h} 100% ${hsl.l}%))` },
    { key: "l" as const, name: t("밝기", "Lightness"), max: 100, unit: "%", track: `linear-gradient(90deg,#000,hsl(${hsl.h} ${hsl.s}% 50%),#fff)` },
  ]
  const reset = () => { setHsl(referenceHsl); setChanged(false); setGray(false); setConnected(false); setBackgrounds(["#202020", "#E5E5E5"]) }

  return <section className="attribute-study" aria-labelledby={`${id}-title`}>
    <header className="attribute-heading"><div><span className="study-kicker">01 / COLOR & PERCEPTION</span><h3 id={`${id}-title`}>{t("색의 세 속성 · 주변색", "Color properties & context")}</h3></div><button type="button" className="lab-text-button" onClick={reset} aria-label={t("색 속성 실험 초기화", "Reset color property experiment")}><RotateCcw size={13}/>{t("초기화", "Reset")}</button></header>
    <div className="attribute-comparison">
      <div><span style={{ background: base.hex }}/><p>{t("선택한 기준색", "Selected reference")}<code>{base.hex}</code></p></div>
      <ArrowRight size={15} aria-hidden="true"/>
      <div><span style={{ background: result }}/><p>{t("실험 결과", "Experiment result")}<code>{result}</code></p></div>
    </div>
    <div className="attribute-controls">
      {axes.map(axis => <label key={axis.key} htmlFor={`${id}-${axis.key}`}><span>{axis.name}</span><input id={`${id}-${axis.key}`} type="range" min={0} max={axis.max} step={0.1} value={hsl[axis.key]} style={{ backgroundImage: axis.track }} onChange={e => { setHsl(current => ({ ...current, [axis.key]: Number(e.target.value) })); setChanged(true) }}/><output htmlFor={`${id}-${axis.key}`}>{Number(hsl[axis.key].toFixed(1))}{axis.unit}</output></label>)}
    </div>
    <div className="attribute-result-actions"><button type="button" className="lab-button" disabled={result.toUpperCase() === base.hex.toUpperCase()} onClick={() => onSelectColor(result)}>{t("실험 결과로 선택", "Use result as selected color")}<ArrowRight size={13}/></button></div>
    <div className="attribute-context-heading"><h4>{t("같은 색, 다른 배경", "Same color, different backgrounds")}</h4><button type="button" className="lab-text-button" onClick={() => setConnected(value => !value)} aria-pressed={connected}>{t("색 연결해 확인", "Connect to compare")}</button></div>
    <div className={`attribute-context${connected ? " is-connected" : ""}`}>
      {backgrounds.map((bg, index) => <div key={index} style={{ background: bg }}><span style={{ background: display }}/></div>)}
    </div>
    <div className="attribute-context-controls">
      <div className="attribute-bg-inputs">{backgrounds.map((bg, index) => <label key={index}><span>{index === 0 ? t("왼쪽", "Left") : t("오른쪽", "Right")}</span><input type="color" value={bg} aria-label={index === 0 ? t("왼쪽 비교 배경색", "Left comparison background color") : t("오른쪽 비교 배경색", "Right comparison background color")} onChange={e => setBackgrounds(current => current.map((color, i) => i === index ? e.target.value : color))}/></label>)}</div>
      <button type="button" className="lab-text-button" onClick={() => setBackgrounds(["#3C5969", "#CB9B78"])}>{t("쿨 / 웜 배경", "Cool / warm backgrounds")}</button>
      <button type="button" className="lab-text-button" aria-pressed={gray} onClick={() => setGray(value => !value)}>{t("중심색 흑백", "Grayscale center")}</button>
    </div>
    <p className="attribute-note">{t("중심의 두 색은 같은 값입니다.", "Both center swatches have the same value.")} <code>{display}</code></p>
    <details className="study-explanation"><summary>{t("밝기와 상대휘도는 어떻게 다를까?", "How do lightness and luminance differ?")}</summary><div>
      <p>{t("밝기 슬라이더는 HSL의 L을 조절합니다. 같은 값이어도 노랑과 파랑은 다르게 밝아 보일 수 있어요.", "The lightness slider controls HSL L. Yellow and blue can look different in brightness even at the same value.")}</p>
      <p>{t("상대휘도는 검정 0%, 흰색 100%를 기준으로 계산한 밝기 값입니다. 주로 글자와 배경의 대비를 구할 때 씁니다.", "Relative luminance measures a color's light level from black at 0% to white at 100%. It is used to calculate contrast between text and backgrounds.")}</p>
      <p className="attribute-luminance">{t("현재 색의 상대휘도", "Current relative luminance")} <strong>{(relativeLuminance(result) * 100).toFixed(1)}%</strong></p>
      <button type="button" className="lab-text-button" onClick={() => { setHsl({ h: 60, s: 100, l: 50 }); setChanged(true) }}>{t("밝기 50% · 노랑으로 비교", "Compare yellow · 50% lightness")}</button>
      <button type="button" className="lab-text-button" onClick={() => { setHsl({ h: 240, s: 100, l: 50 }); setChanged(true) }}>{t("밝기 50% · 파랑으로 비교", "Compare blue · 50% lightness")}</button>
      <p>{t("배경을 바꿔도 중심색과 상대휘도 값은 같습니다. 중심색 흑백은 상대휘도를 기준으로 만든 회색입니다.", "Changing the background does not change the center color or its relative luminance. Grayscale center uses a gray calculated from that luminance.")}</p>
      <a href="https://www.w3.org/TR/css-color-4/#the-hsl-notation" target="_blank" rel="noreferrer">{t("참고 · W3C의 HSL 설명 ↗", "Reference · W3C on HSL ↗")}</a>
    </div></details>
  </section>
}
