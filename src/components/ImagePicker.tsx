"use client"

import { useRef, useState } from "react"
import { cn, rgbToHex } from "@/lib/utils"

interface ImagePickerProps {
  src: string
  onPick: (hex: string) => void
  className?: string
}

/**
 * Shows an image with a crosshair cursor; hovering previews the pixel color
 * under the cursor and clicking picks it. Pixels are read from an offscreen
 * canvas drawn at the image's natural size.
 */
export function ImagePicker({ src, onPick, className }: ImagePickerProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [hoverHex, setHoverHex] = useState<string | null>(null)
  const [pickable, setPickable] = useState(true)

  const ensureCanvas = (): HTMLCanvasElement | null => {
    const img = imgRef.current
    if (!img || !img.naturalWidth) return null
    if (!canvasRef.current) canvasRef.current = document.createElement("canvas")
    const c = canvasRef.current
    if (c.width !== img.naturalWidth) {
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const ctx = c.getContext("2d", { willReadFrequently: true })
      if (!ctx) return null
      try {
        ctx.drawImage(img, 0, 0)
      } catch {
        setPickable(false)
        return null
      }
    }
    return c
  }

  const sampleAt = (clientX: number, clientY: number): string | null => {
    const img = imgRef.current
    const c = ensureCanvas()
    if (!img || !c) return null
    const rect = img.getBoundingClientRect()
    const px = Math.floor(((clientX - rect.left) / rect.width) * img.naturalWidth)
    const py = Math.floor(((clientY - rect.top) / rect.height) * img.naturalHeight)
    const ctx = c.getContext("2d", { willReadFrequently: true })
    if (!ctx) return null
    try {
      const d = ctx.getImageData(
        Math.max(0, Math.min(px, c.width - 1)),
        Math.max(0, Math.min(py, c.height - 1)),
        1,
        1
      ).data
      return rgbToHex(d[0], d[1], d[2])
    } catch {
      setPickable(false)
      return null
    }
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-border bg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt=""
        crossOrigin="anonymous"
        onMouseMove={(e) => pickable && setHoverHex(sampleAt(e.clientX, e.clientY))}
        onMouseLeave={() => setHoverHex(null)}
        onClick={(e) => {
          if (!pickable) return
          const hex = sampleAt(e.clientX, e.clientY)
          if (hex) onPick(hex)
        }}
        className={cn(
          "block w-full h-auto max-h-80 object-contain select-none",
          pickable ? "cursor-crosshair" : "cursor-not-allowed"
        )}
      />

      {hoverHex && (
        <div className="pointer-events-none absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-md border border-border bg-card/95 px-1.5 py-1 shadow-sm backdrop-blur">
          <span className="h-4 w-4 rounded border border-border" style={{ backgroundColor: hoverHex }} />
          <span className="font-mono text-[10px] font-medium">{hoverHex}</span>
        </div>
      )}
    </div>
  )
}
