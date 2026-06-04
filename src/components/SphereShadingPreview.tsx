"use client"

import { useId } from "react"
import { useTranslations } from "next-intl"
import type { ShadingScheme } from "@/lib/exporters"

interface SphereShadingPreviewProps {
  scheme: ShadingScheme
  className?: string
}

// Sphere geometry (in viewBox units).
const CX = 110
const CY = 92
const R = 72

// Rim arc along the lower-right (shadow-side) edge, light coming from upper-left.
function arcPath(startDeg: number, endDeg: number): string {
  const p = (deg: number) => {
    const rad = (deg * Math.PI) / 180
    return [CX + R * Math.cos(rad), CY + R * Math.sin(rad)]
  }
  const [sx, sy] = p(startDeg)
  const [ex, ey] = p(endDeg)
  return `M${sx.toFixed(1)},${sy.toFixed(1)} A${R},${R} 0 0,1 ${ex.toFixed(1)},${ey.toFixed(1)}`
}

/**
 * Renders the palette as a classic sphere-shading study: a ball lit from the
 * upper-left with specular → midtone → shadow falloff, a complementary rim/back
 * light on the far edge, and a calm background — all from the picked colors.
 */
export function SphereShadingPreview({ scheme, className }: SphereShadingPreviewProps) {
  const t = useTranslations("a11y")
  const uid = useId()
  const gradId = `sphere-${uid}`
  const blurId = `rim-${uid}`
  const clipId = `clip-${uid}`

  return (
    <svg
      viewBox="0 0 220 200"
      className={className}
      role="img"
      aria-label={t("spherePreview")}
    >
      <defs>
        <radialGradient id={gradId} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={scheme.specular.hex} />
          <stop offset="40%" stopColor={scheme.midtone.hex} />
          <stop offset="100%" stopColor={scheme.shadow.hex} />
        </radialGradient>
        <filter id={blurId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <clipPath id={clipId}>
          <circle cx={CX} cy={CY} r={R} />
        </clipPath>
      </defs>

      {/* Background */}
      <rect x="0" y="0" width="220" height="200" rx="14" fill={scheme.background.hex} />

      {/* Cast shadow */}
      <ellipse cx={CX} cy={CY + R + 8} rx={R * 0.9} ry="12" fill={scheme.shadow.hex} opacity="0.45" />

      {/* Sphere body */}
      <circle cx={CX} cy={CY} r={R} fill={`url(#${gradId})`} />

      {/* Rim / back light on the shadow-side edge, clipped to the sphere so it
          stays inside the silhouette instead of spilling past the edge. */}
      <path
        d={arcPath(-38, 92)}
        fill="none"
        stroke={scheme.rim.hex}
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.9"
        filter={`url(#${blurId})`}
        clipPath={`url(#${clipId})`}
      />

      {/* Crisp specular highlight */}
      <circle cx={CX - 26} cy={CY - 30} r="7" fill={scheme.specular.hex} opacity="0.9" />
    </svg>
  )
}
