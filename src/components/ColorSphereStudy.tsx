"use client"

import { useMemo, useState } from "react"
import { useLocale } from "next-intl"
import { SphereShadingPreview } from "@/components/SphereShadingPreview"
import { buildSphereShading, type SphereShadingMode } from "@/lib/sphereShading"

interface ColorSphereStudyProps {
  hex: string
  onSelectColor: (hex: string) => void
}

export function ColorSphereStudy({ hex, onSelectColor }: ColorSphereStudyProps) {
  const ko = useLocale() === "ko"
  const [mode, setMode] = useState<SphereShadingMode>("normal")
  const study = useMemo(() => buildSphereShading(hex, mode), [hex, mode])
  const roles = [
    { key: "light", label: ko ? "밝은 면" : "Light", color: study.light },
    { key: "base", label: ko ? "선택한 색" : "Selected color", color: study.base },
    { key: "shadow", label: ko ? "그림자" : "Shadow", color: study.shadow },
  ]

  return (
    <section className="overview-sphere">
      <div className="sphere-heading">
        <h3>{ko ? "회화적 구체 셰이딩" : "Painterly sphere shading"}</h3>
        <div className="sphere-modes" role="group" aria-label={ko ? "구체 셰이딩 방식" : "Sphere shading mode"}>
          {(["normal", "coldwarm"] as const).map(value => (
            <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}>
              {value === "normal" ? (ko ? "노멀" : "Normal") : (ko ? "콜드웜" : "Coldwarm")}
            </button>
          ))}
        </div>
      </div>
      <div className="sphere-study">
        <SphereShadingPreview study={study} className="sphere-study-preview" />
        <div className="sphere-colors">
          {roles.map(({ key, label, color }) => (
            <button key={key} type="button" className={`sphere-role${key === "base" ? " is-base" : ""}`}
              aria-label={`${label} ${color.hex} ${ko ? "탐색 색으로 선택" : "select to explore"}`}
              title={ko ? "이 색으로 다시 탐색" : "Explore this color"}
              onClick={() => onSelectColor(color.hex)}>
              <span style={{ background: color.hex }} /><span>{label}</span><code>{color.hex}</code>
            </button>
          ))}
        </div>
      </div>
      <p className="lab-help">{mode === "normal"
        ? (ko ? "선택한 색으로 만든 회화용 명암 단계입니다. 아래 ‘색 · 빛 실험’의 조명과 비교해보세요." : "A painterly value ramp from your selected color. Compare it with the lighting in Color & light experiments below.")
        : (ko ? "따뜻한 명부와 차가운 암부로 설계한 색 단계입니다. 모든 그림자가 차가워지는 것은 아니에요." : "A designed warm-light, cool-shadow ramp. Shadows are not always cool.")}</p>
    </section>
  )
}
