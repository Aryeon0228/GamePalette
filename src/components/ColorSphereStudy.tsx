"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { PaintedSpherePreview } from "@/components/PaintedSpherePreview"
import { colorFromHex, generateShadingScheme } from "@/lib/colorAnalysis"
import type { SpherePaint } from "@/lib/paintedSphere"

interface ColorSphereStudyProps {
  hex: string
  onSelectColor: (hex: string) => void
}

/** The painterly steps (회화용 명암 단계) of the current color, painted onto a sphere. */
export function ColorSphereStudy({ hex, onSelectColor }: ColorSphereStudyProps) {
  const ko = useLocale() === "ko"
  const t = useTranslations("analyzer")
  const [paint, setPaint] = useState<SpherePaint>("steps")
  // The same steps as the painterly card beside it, so every swatch there has its place here.
  const steps = useMemo(() => generateShadingScheme(colorFromHex(hex)), [hex])

  return (
    <section className="overview-sphere">
      <div className="sphere-heading">
        <h3>{ko ? "구체에 적용" : "Apply to a sphere"}</h3>
        <div className="sphere-modes" role="group" aria-label={ko ? "칠하는 방식" : "How the sphere is painted"}>
          {(["steps", "blend"] as const).map(value => (
            <button key={value} type="button" aria-pressed={paint === value} onClick={() => setPaint(value)}>
              {value === "steps" ? (ko ? "단계" : "Steps") : (ko ? "블렌딩" : "Blended")}
            </button>
          ))}
        </div>
      </div>
      <div className="sphere-study">
        <PaintedSpherePreview steps={steps} paint={paint} className="sphere-study-preview" />
        <div className="sphere-colors">
          {steps.map(({ role, color }) => {
            const name = t(`shade.${role}`)
            return (
              <button key={role} type="button" className={`sphere-role${role === "midtone" ? " is-base" : ""}`}
                aria-label={`${name} ${color.hex} ${ko ? "현재 색으로 선택" : "select as the current color"}`}
                title={role === "midtone" ? (ko ? "선택한 색" : "The selected color") : (ko ? "현재 색으로 선택" : "Use as the current color")}
                onClick={() => onSelectColor(color.hex)}>
                <span style={{ background: color.hex }} /><span>{name}</span><code>{color.hex}</code>
              </button>
            )
          })}
        </div>
      </div>
      <p className="lab-help">{paint === "steps"
        ? (ko ? "회화용 명암 단계의 일곱 색을 구체의 제자리에 그대로 칠했습니다." : "The seven painterly steps, each painted flat where it belongs on the sphere.")
        : (ko ? "같은 일곱 색을 경계만 부드럽게 섞어 칠했습니다." : "The same seven colors, blended only where they meet.")}</p>
    </section>
  )
}
