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
        <h3>{ko ? "구체에 적용" : "Apply to a sphere"}</h3>
        <div className="sphere-modes" role="group" aria-label={ko ? "구체 셰이딩 방식" : "Sphere shading mode"}>
          {(["normal", "coldwarm"] as const).map(value => (
            <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}>
              {value === "normal" ? (ko ? "기본 명암" : "Value") : (ko ? "한난 명암" : "Warm / cool")}
            </button>
          ))}
        </div>
      </div>
      <div className="sphere-study">
        <SphereShadingPreview study={study} className="sphere-study-preview" />
        <div className="sphere-colors">
          {roles.map(({ key, label, color }) => (
            <button key={key} type="button" className={`sphere-role${key === "base" ? " is-base" : ""}`}
              aria-label={`${label} ${color.hex} ${ko ? "현재 색으로 선택" : "select as the current color"}`}
              title={ko ? "현재 색으로 선택" : "Use as the current color"}
              onClick={() => onSelectColor(color.hex)}>
              <span style={{ background: color.hex }} /><span>{label}</span><code>{color.hex}</code>
            </button>
          ))}
        </div>
      </div>
      <p className="lab-help">{mode === "normal"
        ? (ko ? "현재 색으로 만든 밝고 어두운 단계를 구체에 적용한 회화 예시입니다." : "A painting example that applies lighter and darker steps from the current color to a sphere.")
        : (ko ? "따뜻한 명부와 차가운 암부로 설계한 회화 예시입니다." : "A painting example designed with warm light and cool shadows.")}</p>
    </section>
  )
}
