"use client"

import { useMemo } from "react"

/**
 * A hue color wheel that plots colors as dots at their position on the wheel.
 * Used to visualize complementary / harmony relationships (ported from mobile).
 */

const WHEEL_SIZE = 120
const CENTER = WHEEL_SIZE / 2
const OUTER_R = 50
const INNER_R = 36
const MID_R = (OUTER_R + INNER_R) / 2
const DOT_R = 6
const SEGMENTS = 36 // 10° per segment

// Static donut ring segments, one per hue band.
const RING_SEGMENTS = Array.from({ length: SEGMENTS }, (_, index) => {
  const startAngle = ((index * 360) / SEGMENTS - 90) * (Math.PI / 180)
  const endAngle = (((index + 1) * 360) / SEGMENTS - 90) * (Math.PI / 180)
  const x1o = CENTER + OUTER_R * Math.cos(startAngle)
  const y1o = CENTER + OUTER_R * Math.sin(startAngle)
  const x2o = CENTER + OUTER_R * Math.cos(endAngle)
  const y2o = CENTER + OUTER_R * Math.sin(endAngle)
  const x2i = CENTER + INNER_R * Math.cos(endAngle)
  const y2i = CENTER + INNER_R * Math.sin(endAngle)
  const x1i = CENTER + INNER_R * Math.cos(startAngle)
  const y1i = CENTER + INNER_R * Math.sin(startAngle)
  return {
    key: index,
    fill: `hsl(${(index * 360) / SEGMENTS}, 75%, 55%)`,
    d: `M${x1o},${y1o} A${OUTER_R},${OUTER_R} 0 0,1 ${x2o},${y2o} L${x2i},${y2i} A${INNER_R},${INNER_R} 0 0,0 ${x1i},${y1i} Z`,
  }
})

interface HarmonyWheelProps {
  /** Base hue (0-360); each dot is placed at baseHue + its angle. */
  baseHue: number
  colors: Array<{ hex: string; angle: number }>
  /** Rendered pixel size (the SVG scales via viewBox). */
  size?: number
}

export function HarmonyWheel({ baseHue, colors, size = WHEEL_SIZE }: HarmonyWheelProps) {
  const dots = useMemo(
    () =>
      colors.map((color, index) => {
        const angle = ((baseHue + color.angle - 90) * Math.PI) / 180
        return {
          cx: CENTER + MID_R * Math.cos(angle),
          cy: CENTER + MID_R * Math.sin(angle),
          hex: color.hex,
          idx: index,
        }
      }),
    [baseHue, colors]
  )

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
      role="img"
      aria-label="Color wheel showing harmony relationships"
    >
      {RING_SEGMENTS.map((segment) => (
        <path key={segment.key} d={segment.d} fill={segment.fill} opacity={0.6} />
      ))}

      {dots.length >= 2 &&
        dots.map((dot, index) => {
          const next = dots[(index + 1) % dots.length]
          return (
            <line
              key={`line-${index}`}
              x1={dot.cx}
              y1={dot.cy}
              x2={next.cx}
              y2={next.cy}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={1.5}
            />
          )
        })}

      {dots.map((dot) => (
        <g key={dot.idx}>
          <circle cx={dot.cx} cy={dot.cy} r={DOT_R + 1.5} fill="rgba(0,0,0,0.5)" />
          <circle cx={dot.cx} cy={dot.cy} r={DOT_R} fill={dot.hex} stroke="rgba(255,255,255,0.7)" strokeWidth={1} />
        </g>
      ))}
    </svg>
  )
}
