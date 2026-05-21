import { Color } from "@/types"

/**
 * Convert an image into ASCII art, optionally tinting each character with the
 * nearest palette color. Uses a canvas to downsample the image so each output
 * character maps to one averaged pixel.
 */

// Dark → light: denser glyphs represent darker pixels.
const RAMP = "@%#*+=-:. "

// Monospace glyphs are roughly twice as tall as they are wide, so we squash
// the row count to keep the art's proportions close to the source image.
const CHAR_ASPECT = 0.5

export interface AsciiArtResult {
  text: string
  /** Standalone HTML document with each glyph tinted by the nearest palette color. */
  html: string
  /** Just the tinted <span> rows, for embedding in a preview. */
  htmlBody: string
  cols: number
  rows: number
}

export interface AsciiArtOptions {
  /** Number of characters per row. */
  width?: number
  /** Palette used to tint the colored HTML output. */
  colors?: Color[]
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function nearestColorHex(r: number, g: number, b: number, colors: Color[]): string {
  let best = colors[0]
  let bestDist = Infinity
  for (const color of colors) {
    const dr = r - color.rgb.r
    const dg = g - color.rgb.g
    const db = b - color.rgb.b
    const dist = dr * dr + dg * dg + db * db
    if (dist < bestDist) {
      bestDist = dist
      best = color
    }
  }
  return best.hex
}

function escapeHtml(ch: string): string {
  if (ch === "<") return "&lt;"
  if (ch === ">") return "&gt;"
  if (ch === "&") return "&amp;"
  return ch
}

export async function imageToAscii(
  imageUrl: string,
  options: AsciiArtOptions = {}
): Promise<AsciiArtResult> {
  const width = Math.max(20, Math.min(240, options.width ?? 80))
  const colors = options.colors ?? []

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      try {
        const cols = width
        const rows = Math.max(1, Math.round((cols * (img.height / img.width)) * CHAR_ASPECT))

        const canvas = document.createElement("canvas")
        canvas.width = cols
        canvas.height = rows
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }
        ctx.drawImage(img, 0, 0, cols, rows)
        const data = ctx.getImageData(0, 0, cols, rows).data

        const textRows: string[] = []
        const htmlRows: string[] = []
        const canTint = colors.length > 0

        for (let y = 0; y < rows; y++) {
          let textLine = ""
          let htmlLine = ""
          for (let x = 0; x < cols; x++) {
            const idx = (y * cols + x) * 4
            const r = data[idx]
            const g = data[idx + 1]
            const b = data[idx + 2]
            const lum = luminance(r, g, b)
            const rampIndex = Math.round((1 - lum / 255) * (RAMP.length - 1))
            const ch = RAMP[rampIndex]
            textLine += ch
            if (canTint) {
              const hex = nearestColorHex(r, g, b, colors)
              htmlLine += `<span style="color:${hex}">${escapeHtml(ch)}</span>`
            } else {
              htmlLine += escapeHtml(ch)
            }
          }
          textRows.push(textLine)
          htmlRows.push(htmlLine)
        }

        const text = textRows.join("\n")
        const htmlBody = htmlRows.join("\n")
        const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Pixel Paw ASCII</title></head>
<body style="margin:0;background:#0d0d12;">
<pre style="font:10px/10px ui-monospace,Menlo,Consolas,monospace;letter-spacing:0;padding:16px;color:#e5e5e5;">
${htmlRows.join("\n")}
</pre>
</body>
</html>`

        resolve({ text, html, htmlBody, cols, rows })
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = imageUrl
  })
}
