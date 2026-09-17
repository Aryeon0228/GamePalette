export type CompositionGuideKind = "thirds" | "golden" | "diagonals" | "spiral"

export interface CompositionCrop {
  sx: number
  sy: number
  sw: number
  sh: number
}

/**
 * Source rectangle for a cover crop. Pan is -100 at the left/top edge, 0 at
 * center, and 100 at the right/bottom edge; a fully visible axis cannot pan.
 * Fractional source pixels preserve the requested aspect without stretching.
 */
export function compositionCrop(
  sourceW: number,
  sourceH: number,
  frameAspect: number,
  panX = 0,
  panY = 0,
): CompositionCrop {
  if (![sourceW, sourceH, frameAspect].every(value => Number.isFinite(value) && value > 0)) {
    throw new RangeError("Image dimensions and frame aspect must be finite and positive")
  }
  const sourceAspect = sourceW / sourceH
  const sw = sourceAspect > frameAspect ? sourceH * frameAspect : sourceW
  const sh = sourceAspect > frameAspect ? sourceH : sourceW / frameAspect
  const pan = (value: number) => (Math.max(-100, Math.min(100, Number.isNaN(value) ? 0 : value)) + 100) / 200
  return { sx: (sourceW - sw) * pan(panX), sy: (sourceH - sh) * pan(panY), sw, sh }
}

const linearChannels = Array.from({ length: 256 }, (_, value) => {
  const encoded = value / 255
  return encoded <= 0.04045 ? encoded / 12.92 : ((encoded + 0.055) / 1.055) ** 2.4
})

/**
 * Flatten on white in linear light, then use the same display-encoded sRGB
 * luminance as imageValueStudy. Equality belongs to white; inversion exchanges
 * black and white after classification. The source buffer is never modified.
 */
export function renderCompositionMask(
  rgba: Uint8ClampedArray,
  threshold: number,
  inverted: boolean,
): Uint8ClampedArray {
  if (rgba.length % 4 !== 0) throw new RangeError("RGBA data must contain complete pixels")
  const boundary = Number.isFinite(threshold) ? Math.max(0, Math.min(255, threshold)) : 128
  const result = new Uint8ClampedArray(rgba.length)
  for (let index = 0; index < rgba.length; index += 4) {
    const alpha = rgba[index + 3] / 255
    const sourceY = 0.2126 * linearChannels[rgba[index]]
      + 0.7152 * linearChannels[rgba[index + 1]]
      + 0.0722 * linearChannels[rgba[index + 2]]
    const luminance = sourceY * alpha + (1 - alpha)
    const encoded = luminance <= 0.0031308 ? luminance * 12.92 : 1.055 * luminance ** (1 / 2.4) - 0.055
    const gray = Math.round(Math.max(0, Math.min(1, encoded)) * 255)
    const black = gray < boundary
    const value = black !== inverted ? 0 : 255
    result[index] = result[index + 1] = result[index + 2] = value
    result[index + 3] = 255
  }
  return result
}

export const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2

export interface GoldenSpiralPoint {
  x: number
  y: number
  /** Radians, increasing clockwise in SVG's downward-positive y axis. */
  angle: number
  /** Distance from GOLDEN_SPIRAL_CENTER in the unit square. */
  radius: number
}

const spiralSegments = 384
const rawSpiral = Array.from({ length: spiralSegments + 1 }, (_, index) => {
  const angle = -6 * Math.PI + index * 6 * Math.PI / spiralSegments
  const radius = GOLDEN_RATIO ** (2 * angle / Math.PI)
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle), angle, radius }
})
const spiralMinX = Math.min(...rawSpiral.map(point => point.x))
const spiralMaxX = Math.max(...rawSpiral.map(point => point.x))
const spiralMinY = Math.min(...rawSpiral.map(point => point.y))
const spiralMaxY = Math.max(...rawSpiral.map(point => point.y))
const spiralScale = 0.96 / Math.max(spiralMaxX - spiralMinX, spiralMaxY - spiralMinY)

/** Polar origin after uniformly fitting the spiral's bounds into the unit square. */
export const GOLDEN_SPIRAL_CENTER = {
  x: 0.5 - (spiralMinX + spiralMaxX) / 2 * spiralScale,
  y: 0.5 - (spiralMinY + spiralMaxY) / 2 * spiralScale,
} as const

/**
 * A true logarithmic golden spiral: raw r(theta) = phi^(2 * theta / pi).
 * Three continuous outward turns run from theta=-6pi to theta=0, ending to the
 * right of the polar center. Every quarter turn multiplies the radius by phi.
 * Fit the actual sampled bounds uniformly into [0,1]^2 with a 2% margin on the
 * longest axis and center both bounds. Further scaling must also be uniform.
 */
export function goldenSpiralPoints(): GoldenSpiralPoint[] {
  return rawSpiral.map(point => ({
    x: GOLDEN_SPIRAL_CENTER.x + point.x * spiralScale,
    y: GOLDEN_SPIRAL_CENTER.y + point.y * spiralScale,
    angle: point.angle,
    radius: point.radius * spiralScale,
  }))
}

export interface CompositionGuideGeometry {
  /** Intrinsic 1000x1000 SVG coordinates, including the spiral. */
  viewBox: "0 0 1000 1000"
  bounds: { x: number; y: number; width: number; height: number }
  paths: string[]
  /** Grids fill any frame; the spiral must keep its intrinsic square aspect. */
  preserveAspectRatio: "none" | "xMidYMid meet"
}

/** Rotate/flip spiral paths around (500,500), then fit them with uniform scale. */
export function compositionGuideGeometry(kind: CompositionGuideKind): CompositionGuideGeometry {
  let paths: string[]
  if (kind === "spiral") {
    paths = [goldenSpiralPoints().map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x * 1000} ${point.y * 1000}`,
    ).join(" ")]
  } else if (kind === "diagonals") {
    paths = ["M 0 0 L 1000 1000", "M 0 1000 L 1000 0"]
  } else {
    const positions = kind === "thirds" ? [1 / 3, 2 / 3] : [1 - 1 / GOLDEN_RATIO, 1 / GOLDEN_RATIO]
    paths = positions.flatMap(position => {
      const coordinate = position * 1000
      return [`M ${coordinate} 0 L ${coordinate} 1000`, `M 0 ${coordinate} L 1000 ${coordinate}`]
    })
  }
  return {
    viewBox: "0 0 1000 1000",
    bounds: { x: 0, y: 0, width: 1000, height: 1000 },
    paths,
    preserveAspectRatio: kind === "spiral" ? "xMidYMid meet" : "none",
  }
}
