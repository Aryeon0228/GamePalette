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
  const [example, setExample] = useState<{ name: "yellow" | "blue"; gray: boolean } | null>(null)

  useEffect(() => { setHsl(referenceHsl); setChanged(false); setExample(null) }, [referenceHsl])
  // An untouched picked color must remain exact despite rounded HSL metadata.
  const result = changed ? attributeColor(hsl) : base.hex
  // Examples only preview in the context swatches; the user's adjustments stay intact.
  const contextColor = example ? example.name === "yellow" ? "#FFFF00" : "#0000FF" : result
  const contextGray = example ? example.gray : gray
  const display = contextGray ? luminanceGray(contextColor) : contextColor
  const axes = [
    { key: "h" as const, name: t("색상", "Hue"), max: 360, unit: "°", track: `linear-gradient(90deg, ${Array.from({ length: 7 }, (_, n) => `hsl(${n * 60} 85% 55%)`).join(",")})` },
    { key: "s" as const, name: t("채도", "Saturation"), max: 100, unit: "%", track: `linear-gradient(90deg,hsl(${hsl.h} 0% ${hsl.l}%),hsl(${hsl.h} 100% ${hsl.l}%))` },
    { key: "l" as const, name: t("밝기", "Lightness"), max: 100, unit: "%", track: `linear-gradient(90deg,#000,hsl(${hsl.h} ${hsl.s}% 50%),#fff)` },
  ]
  const reset = () => { setHsl(referenceHsl); setChanged(false); setGray(false); setExample(null); setConnected(false); setBackgrounds(["#202020", "#E5E5E5"]) }

  return <section className="attribute-study" aria-labelledby={`${id}-title`}>
    <header className="attribute-heading"><div><span className="study-kicker">01 / COLOR & PERCEPTION</span><h3 id={`${id}-title`}>{t("색의 세 속성 · 주변색", "Color properties & context")}</h3></div><button type="button" className="lab-text-button" onClick={reset} aria-label={t("색 속성 실험 초기화", "Reset color property experiment")}><RotateCcw size={13}/>{t("초기화", "Reset")}</button></header>
    <div className="attribute-comparison">
      <div><span style={{ background: base.hex }}/><p>{t("선택한 기준색", "Selected reference")}<code>{base.hex}</code></p></div>
      <ArrowRight size={15} aria-hidden="true"/>
      <div><span style={{ background: result }}/><p>{t("조정한 색", "Adjusted color")}<code>{result}</code></p></div>
    </div>
    <div className="attribute-controls">
      {axes.map(axis => <label key={axis.key} htmlFor={`${id}-${axis.key}`}><span>{axis.name}</span><input id={`${id}-${axis.key}`} type="range" min={0} max={axis.max} step={0.1} value={hsl[axis.key]} style={{ backgroundImage: axis.track }} onChange={e => { setHsl(current => ({ ...current, [axis.key]: Number(e.target.value) })); setChanged(true); setExample(null) }}/><output htmlFor={`${id}-${axis.key}`}>{Number(hsl[axis.key].toFixed(1))}{axis.unit}</output></label>)}
    </div>
    <div className="attribute-result-actions"><button type="button" className="lab-button" disabled={result.toUpperCase() === base.hex.toUpperCase()} onClick={() => { setExample(null); onSelectColor(result) }}>{t("이 색으로 선택", "Select this color")}<ArrowRight size={13}/></button></div>
    <div className="attribute-context-heading"><h4>{t("같은 색, 다른 배경", "Same color, different backgrounds")}</h4><button type="button" className="lab-text-button" onClick={() => setConnected(value => !value)} aria-pressed={connected}>{t("색 연결해 확인", "Connect to compare")}</button></div>
    {example && <div className="attribute-example-status">
      <p role="status">{example.name === "yellow" ? t("노랑 예시 · HSL 밝기 50%", "Yellow example · HSL lightness 50%") : t("파랑 예시 · HSL 밝기 50%", "Blue example · HSL lightness 50%")}</p>
      <button type="button" className="lab-button" onClick={() => setExample(null)}><RotateCcw size={13} aria-hidden="true"/>{t("내 색으로 돌아가기", "Back to my color")}</button>
    </div>}
    <div className={`attribute-context${connected ? " is-connected" : ""}`}>
      {backgrounds.map((bg, index) => <div key={index} style={{ background: bg }}><span style={{ background: display }}/></div>)}
    </div>
    <div className="attribute-context-controls">
      <div className="attribute-bg-inputs">{backgrounds.map((bg, index) => <label key={index}><span>{index === 0 ? t("왼쪽", "Left") : t("오른쪽", "Right")}</span><input type="color" value={bg} aria-label={index === 0 ? t("왼쪽 비교 배경색", "Left comparison background color") : t("오른쪽 비교 배경색", "Right comparison background color")} onChange={e => setBackgrounds(current => current.map((color, i) => i === index ? e.target.value : color))}/></label>)}</div>
      <button type="button" className="lab-text-button" onClick={() => setBackgrounds(["#3C5969", "#CB9B78"])}>{t("쿨 / 웜 배경", "Cool / warm backgrounds")}</button>
      <button type="button" className="lab-text-button" aria-pressed={contextGray} aria-controls={`${id}-grayscale-info`} onClick={() => example ? setExample({ ...example, gray: !example.gray }) : setGray(value => !value)}>{t("중심색 흑백", "Grayscale center")}</button>
    </div>
    <div id={`${id}-grayscale-info`} className="attribute-grayscale-info" hidden={!contextGray}>
      <p className="attribute-luminance">{t("흑백 변환 기준 · 상대휘도", "Grayscale basis · relative luminance")} <strong>{(relativeLuminance(contextColor) * 100).toFixed(1)}%</strong></p>
      <p className="attribute-note">{t("눈의 색별 민감도를 반영해 회색으로 바꿉니다.", "Converts to gray using the eye's sensitivity to each color.")}</p>
    </div>
    <p className="attribute-note">{t("중심의 두 색은 같은 값입니다.", "Both center swatches have the same value.")} <code>{display}</code></p>
    <div className="attribute-example-options">
      <p className="attribute-note" id={`${id}-example-help`}>{t("아래 버튼을 눌러 흑백 밝기를 비교하세요. 조정한 색은 유지돼요.", "Click below to compare grayscale brightness. Your adjusted color stays unchanged.")}</p>
      <div className="attribute-examples" role="group" aria-label={t("흑백 비교 예시", "Grayscale comparison examples")} aria-describedby={`${id}-example-help`}>
        <button type="button" className="lab-button" aria-pressed={example?.name === "yellow"} onClick={() => setExample({ name: "yellow", gray: true })}><span className="attribute-example-chip" style={{ background: "#FFFF00" }} aria-hidden="true"/>{t("밝기 50% · 노랑으로 비교", "Lightness 50% · Compare yellow")}</button>
        <button type="button" className="lab-button" aria-pressed={example?.name === "blue"} onClick={() => setExample({ name: "blue", gray: true })}><span className="attribute-example-chip" style={{ background: "#0000FF" }} aria-hidden="true"/>{t("밝기 50% · 파랑으로 비교", "Lightness 50% · Compare blue")}</button>
      </div>
    </div>
    <details className="study-explanation"><summary>{t("흑백 밝기는 어떻게 정할까?", "How is grayscale brightness determined?")}</summary><div>
      <p>{t("눈은 색에 따라 빛에 반응하는 정도가 다릅니다. 상대휘도는 이 차이를 반영해 검정 0%, 흰색 100%를 기준으로 계산한 값입니다.", "The eye responds differently to light of different colors. Relative luminance accounts for this, on a scale from black at 0% to white at 100%.")}</p>
      <p>{t("노랑과 파랑 예시는 모두 HSL 밝기 50%입니다. 흑백으로 바꾸면 상대휘도에 따른 밝기 차이가 드러납니다.", "Both examples have 50% HSL lightness. Grayscale reveals their different relative luminance.")}</p>
      <p>{t("배경 때문에 다르게 보여도 중심색과 상대휘도 값은 같습니다.", "The background can change how bright a color looks, while the center color and its relative luminance remain the same.")}</p>
      <a href="https://www.w3.org/TR/WCAG22/#dfn-relative-luminance" target="_blank" rel="noreferrer">{t("참고 · W3C의 상대휘도 설명 ↗", "Reference · W3C on relative luminance ↗")}</a>{" · "}
      <a href="https://www.w3.org/TR/css-color-4/#the-hsl-notation" target="_blank" rel="noreferrer">{t("참고 · W3C의 HSL 설명 ↗", "Reference · W3C on HSL ↗")}</a>
    </div></details>
  </section>
}
