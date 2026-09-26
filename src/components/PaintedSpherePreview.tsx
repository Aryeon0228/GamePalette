"use client"

import { useEffect, useRef } from "react"
import { useLocale } from "next-intl"
import type { Color } from "@/types"
import type { ShadingStep } from "@/lib/colorAnalysis"
import { paintSpherePoint, spherePalette, type SpherePaint } from "@/lib/paintedSphere"
import { cn } from "@/lib/utils"

interface PaintedSpherePreviewProps {
  steps: ShadingStep[]
  paint: SpherePaint
  className?: string
}

const SCENE_WIDTH = 220
const SCENE_HEIGHT = 200
const CENTER_X = 102
const CENTER_Y = 90
const RADIUS = 70
// Flat steps are sampled 3×3 in each pixel so the edges between them stay smooth.
const SAMPLES: Record<SpherePaint, number> = { steps: 3, blend: 1 }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const rgba = (rgb: Color["rgb"], alpha = 1) => `rgba(${Math.round(rgb.r)},${Math.round(rgb.g)},${Math.round(rgb.b)},${alpha})`

/** The painterly steps painted on a sphere lit from the upper left, standing on the background step. */
export function PaintedSpherePreview({ steps, paint, className }: PaintedSpherePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ko = useLocale() === "ko"
  const midtone = steps.find(step => step.role === "midtone")?.color.hex ?? ""
  const description = ko
    ? `${midtone}의 회화용 명암 단계로 칠한 구체. 왼쪽 위에서 빛이 들고 오른쪽 가장자리에 역광이 걸립니다.`
    : `A sphere painted with the painterly steps of ${midtone}, lit from the upper left, with a rim light on its right edge.`

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    const sphereLayer = document.createElement("canvas")
    const sphereContext = sphereLayer.getContext("2d")
    if (!canvas || !context || !sphereContext) return
    const palette = spherePalette(steps)
    const samples = SAMPLES[paint]
    let animationFrame = 0

    const render = () => {
      const { width: cssWidth, height: cssHeight } = canvas.getBoundingClientRect()
      if (cssWidth <= 0 || cssHeight <= 0) return
      const dpr = clamp(window.devicePixelRatio || 1, 1, 2)
      const width = Math.max(1, Math.round(cssWidth * dpr))
      const height = Math.max(1, Math.round(cssHeight * dpr))
      canvas.width = width
      canvas.height = height
      const scale = Math.min(width / SCENE_WIDTH, height / SCENE_HEIGHT)
      const offsetX = (width - SCENE_WIDTH * scale) / 2
      const offsetY = (height - SCENE_HEIGHT * scale) / 2

      context.fillStyle = rgba(palette.background)
      context.fillRect(0, 0, width, height)

      // The cast shadow falls away from the light in the core shadow's color: one flat shape for
      // steps, a pool that softens away from the contact point for blend.
      context.save()
      context.setTransform(scale, 0, 0, scale, offsetX, offsetY)
      const pool = (x: number, y: number, radiusX: number, radiusY: number, alpha: number) => {
        context.save()
        context.translate(x, y)
        context.scale(1, radiusY / radiusX)
        context.beginPath()
        context.arc(0, 0, radiusX, 0, Math.PI * 2)
        if (paint === "steps") context.fillStyle = rgba(palette.shadow)
        else {
          const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radiusX)
          gradient.addColorStop(0, rgba(palette.shadow, alpha))
          gradient.addColorStop(0.45, rgba(palette.shadow, alpha * 0.6))
          gradient.addColorStop(1, rgba(palette.shadow, 0))
          context.fillStyle = gradient
        }
        context.fill()
        context.restore()
      }
      if (paint === "steps") pool(CENTER_X + 20, CENTER_Y + RADIUS + 2, 58, 9, 1)
      else {
        pool(CENTER_X + 29, CENTER_Y + RADIUS + 5, 68, 12, 0.7)
        pool(CENTER_X + 2, CENTER_Y + RADIUS + 1, 36, 4.5, 0.95)
      }
      context.restore()

      const radius = RADIUS * scale
      const centerX = offsetX + CENTER_X * scale
      const centerY = offsetY + CENTER_Y * scale
      const left = Math.floor(centerX - radius - 1)
      const top = Math.floor(centerY - radius - 1)
      const size = Math.ceil(radius * 2 + 3)
      sphereLayer.width = size
      sphereLayer.height = size
      const pixels = sphereContext.createImageData(size, size)
      const data = pixels.data

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const cx = (left + x + 0.5 - centerX) / radius
          const cy = (top + y + 0.5 - centerY) / radius
          const coverage = clamp((1 - Math.hypot(cx, cy)) * radius + 0.5, 0, 1)
          if (coverage === 0) continue
          let r = 0, g = 0, b = 0
          for (let sy = 0; sy < samples; sy++) {
            for (let sx = 0; sx < samples; sx++) {
              let nx = (left + x + (sx + 0.5) / samples - centerX) / radius
              let ny = (top + y + (sy + 0.5) / samples - centerY) / radius
              const reach = nx * nx + ny * ny
              // Samples past the silhouette take the edge's normal.
              if (reach > 1) { const edge = 1 / Math.sqrt(reach); nx *= edge; ny *= edge }
              const color = paintSpherePoint(palette, nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), paint)
              r += color.r; g += color.g; b += color.b
            }
          }
          const count = samples * samples
          const pixelIndex = (y * size + x) * 4
          data[pixelIndex] = r / count
          data[pixelIndex + 1] = g / count
          data[pixelIndex + 2] = b / count
          data[pixelIndex + 3] = Math.round(coverage * 255)
        }
      }

      sphereContext.putImageData(pixels, 0, 0)
      context.drawImage(sphereLayer, left, top)
    }

    const scheduleRender = () => {
      cancelAnimationFrame(animationFrame)
      animationFrame = requestAnimationFrame(render)
    }
    render()
    const resizeObserver = new ResizeObserver(scheduleRender)
    resizeObserver.observe(canvas)
    // Zooming changes the pixel ratio without resizing the canvas.
    window.addEventListener("resize", scheduleRender)
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", scheduleRender)
      cancelAnimationFrame(animationFrame)
    }
  }, [steps, paint])

  return (
    <canvas ref={canvasRef} width={SCENE_WIDTH} height={SCENE_HEIGHT} className={cn("block w-full", className)} role="img" aria-label={description}>
      {description}
    </canvas>
  )
}
