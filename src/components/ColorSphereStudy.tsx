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
        <h3>{ko ? "구체 셰이딩" : "Sphere shading"}</h3>
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
        ? (ko ? "선택한 색을 그대로 기준으로, 빛과 그림자를 입힙니다." : "Light and shadow built around your exact selected color.")
        : (ko ? "선택한 색을 기준으로 따뜻한 빛, 차가운 그림자를 더합니다." : "Warm light and cool shadows around your selected color.")}</p>
    </section>
  )
}
