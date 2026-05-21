import { Color } from "@/types"

/**
 * Color-space conversions and string formatters for the color detail panel.
 * Inputs are sRGB 0-255 (from Color.rgb).
 */

function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

// ── HSV / HSB ──
export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return { h: Math.round(h), s: Math.round(s * 100), v: Math.round(max * 100) }
}

// ── CMYK ──
export function rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const k = 1 - Math.max(rn, gn, bn)
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 }
  const c = (1 - rn - k) / (1 - k)
  const m = (1 - gn - k) / (1 - k)
  const y = (1 - bn - k) / (1 - k)
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  }
}

// ── CIELAB (D65) ──
export function rgbToLab(r: number, g: number, b: number): { l: number; a: number; b: number } {
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)
  // linear sRGB → XYZ (D65)
  const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) / 0.95047
  const y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175
  const z = (lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = f(x)
  const fy = f(y)
  const fz = f(z)
  return {
    l: Math.round((116 * fy - 16) * 10) / 10,
    a: Math.round((500 * (fx - fy)) * 10) / 10,
    b: Math.round((200 * (fy - fz)) * 10) / 10,
  }
}

// ── OKLab (Björn Ottosson) ──
export function rgbToOklab(r: number, g: number, b: number): { L: number; a: number; b: number } {
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  }
}

// ── OKLCH (polar form of OKLab) ──
export function rgbToOklch(r: number, g: number, b: number): { L: number; c: number; h: number } {
  const { L, a, b: ob } = rgbToOklab(r, g, b)
  const c = Math.sqrt(a * a + ob * ob)
  let h = (Math.atan2(ob, a) * 180) / Math.PI
  if (h < 0) h += 360
  return { L, c, h }
}

export type ColorFormat = "HEX" | "RGB" | "HSL" | "HSV" | "CMYK" | "LAB" | "OKLAB" | "OKLCH"

export const COLOR_FORMATS: ColorFormat[] = ["HEX", "RGB", "HSL", "HSV", "CMYK", "LAB", "OKLAB", "OKLCH"]

export function formatColor(color: Color, format: ColorFormat): string {
  const { r, g, b } = color.rgb
  switch (format) {
    case "RGB":
      return `rgb(${r}, ${g}, ${b})`
    case "HSL":
      return `hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`
    case "HSV": {
      const { h, s, v } = rgbToHsv(r, g, b)
      return `hsv(${h}, ${s}%, ${v}%)`
    }
    case "CMYK": {
      const { c, m, y, k } = rgbToCmyk(r, g, b)
      return `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`
    }
    case "LAB": {
      const { l, a, b: lb } = rgbToLab(r, g, b)
      return `lab(${l}% ${a} ${lb})`
    }
    case "OKLAB": {
      const { L, a, b: ob } = rgbToOklab(r, g, b)
      return `oklab(${L.toFixed(3)} ${a.toFixed(3)} ${ob.toFixed(3)})`
    }
    case "OKLCH": {
      const { L, c, h } = rgbToOklch(r, g, b)
      return `oklch(${L.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`
    }
    case "HEX":
    default:
      return color.hex.toUpperCase()
  }
}
