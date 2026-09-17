export type ValuePreviewMode = "original" | "grayscale" | "tones"
export type ValueBand = 0 | 1 | 2

export const DEFAULT_VALUE_THRESHOLDS = [85, 170] as const
export const VALUE_STUDY_ALPHA_CUTOFF = 128
export const VALUE_TONE_LEVELS = [36, 128, 232] as const

export interface ImageValueAnalysis {
  /** Display-encoded grayscale, derived from linear-light relative luminance. */
  grayscale: Uint8ClampedArray
  /** Pixels with alpha < 128 do not contribute to the histogram or areas. */
  histogram: Uint32Array
  opaquePixelCount: number
}

const linearChannels = Array.from({ length: 256 }, (_, channel) => {
  const encoded = channel / 255
  return encoded <= 0.04045 ? encoded / 12.92 : ((encoded + 0.055) / 1.055) ** 2.4
})

/** sRGB -> linear luminance Y -> encoded sRGB gray. This is not HSL lightness. */
export function grayscaleValue(red: number, green: number, blue: number): number {
  const channel = (value: number) => linearChannels[Math.max(0, Math.min(255, Math.round(value) || 0))]
  const luminance = 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
  const encoded = luminance <= 0.0031308 ? 12.92 * luminance : 1.055 * luminance ** (1 / 2.4) - 0.055
  return Math.round(Math.max(0, Math.min(1, encoded)) * 255)
}

export function analyzeImageValues(pixels: ArrayLike<number>): ImageValueAnalysis {
  const pixelCount = Math.floor(pixels.length / 4)
  const grayscale = new Uint8ClampedArray(pixelCount)
  const histogram = new Uint32Array(256)
  let opaquePixelCount = 0
  for (let pixel = 0; pixel < pixelCount; pixel++) {
    const index = pixel * 4
    const gray = grayscaleValue(pixels[index], pixels[index + 1], pixels[index + 2])
    grayscale[pixel] = gray
    if (pixels[index + 3] < VALUE_STUDY_ALPHA_CUTOFF) continue
    histogram[gray]++
    opaquePixelCount++
  }
  return { grayscale, histogram, opaquePixelCount }
}

/** Keep a nonempty numeric interval available for each of the three bands. */
export function normalizeValueThresholds(lower: number, upper: number): [number, number] {
  const first = Number.isFinite(lower) ? Math.round(lower) : DEFAULT_VALUE_THRESHOLDS[0]
  const second = Number.isFinite(upper) ? Math.round(upper) : DEFAULT_VALUE_THRESHOLDS[1]
  const low = Math.max(1, Math.min(254, Math.min(first, second)))
  const high = Math.max(low + 1, Math.min(255, Math.max(first, second)))
  return [low, high]
}

export function valueBandAt(gray: number, lower: number, upper: number): ValueBand {
  return gray < lower ? 0 : gray < upper ? 1 : 2
}

export function measureValueAreas(analysis: ImageValueAnalysis, lower: number, upper: number) {
  const [low, high] = normalizeValueThresholds(lower, upper)
  const counts: [number, number, number] = [0, 0, 0]
  for (let gray = 0; gray < analysis.histogram.length; gray++) {
    counts[valueBandAt(gray, low, high)] += analysis.histogram[gray]
  }
  return {
    counts,
    percentages: counts.map(count => analysis.opaquePixelCount ? count / analysis.opaquePixelCount * 100 : 0),
  }
}

/** Build a detached preview buffer; neither source pixels nor application state change. */
export function renderValuePreview(
  pixels: Uint8ClampedArray,
  analysis: ImageValueAnalysis,
  mode: ValuePreviewMode,
  lower: number,
  upper: number,
  selectedBand: ValueBand | null = null,
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(pixels)
  const [low, high] = normalizeValueThresholds(lower, upper)
  for (let pixel = 0; pixel < analysis.grayscale.length; pixel++) {
    const index = pixel * 4
    const gray = analysis.grayscale[pixel]
    const band = valueBandAt(gray, low, high)
    if (selectedBand !== null) {
      // Only the selected area retains source color. Other areas become a faint
      // gray guide; excluded transparent pixels never appear in the mask.
      if (pixels[index + 3] < VALUE_STUDY_ALPHA_CUTOFF) result[index + 3] = 0
      else if (band !== selectedBand) {
        result[index] = result[index + 1] = result[index + 2] = gray
        result[index + 3] = Math.round(pixels[index + 3] * 0.18)
      }
    } else if (mode !== "original") {
      const value = mode === "grayscale" ? gray : VALUE_TONE_LEVELS[band]
      result[index] = result[index + 1] = result[index + 2] = value
    }
  }
  return result
}

/** Never upscale; bound memory and analysis cost even for large uploaded images. */
export function valueStudySize(width: number, height: number): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Invalid image dimensions")
  }
  const scale = Math.min(1, 384 / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}
