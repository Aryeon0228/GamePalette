import { Color } from "@/types"
import { COLOR_FORMATS, formatColor } from "./colorFormats"

/** All formats as newline-separated text (for "copy all"). */
export function colorToAllFormatsText(color: Color): string {
  return COLOR_FORMATS.map((fmt) => formatColor(color, fmt)).join("\n")
}

/** A JSON document describing the color in every format. */
export function colorToJson(color: Color): string {
  const formats = Object.fromEntries(
    COLOR_FORMATS.map((fmt) => [fmt.toLowerCase(), formatColor(color, fmt)])
  )
  return JSON.stringify(
    {
      name: color.name,
      hex: color.hex.toUpperCase(),
      rgb: color.rgb,
      hsl: color.hsl,
      formats,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  )
}

function cssVarName(color: Color): string {
  return (color.name || "color")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "color"
}

/** CSS custom properties for the color (hex + rgb + hsl channels). */
export function colorToCss(color: Color): string {
  const name = cssVarName(color)
  const { r, g, b } = color.rgb
  const { h, s, l } = color.hsl
  return `:root {\n  --${name}: ${color.hex.toUpperCase()};\n  --${name}-rgb: ${r} ${g} ${b};\n  --${name}-hsl: ${h} ${s}% ${l}%;\n}`
}
