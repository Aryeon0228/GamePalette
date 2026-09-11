"use client"

import { useEffect, useRef } from "react"
import { useLocale } from "next-intl"
import { sampleSphereRamp, type SphereShadingStudy } from "@/lib/sphereShading"
import { cn } from "@/lib/utils"

interface SphereShadingPreviewProps {
  study: SphereShadingStudy
  className?: string
}

const SCENE_WIDTH = 220
const SCENE_HEIGHT = 200
const CENTER_X = 102
const CENTER_Y = 90
const RADIUS = 70
const RAMP_STEPS = 1024

// Camera faces +Z. Screen Y points down, so negative X/Y lights the upper left.
const LIGHT = [-0.49, -0.66, 0.57]
const LIGHT_LENGTH = Math.hypot(...LIGHT)
const LX = LIGHT[0] / LIGHT_LENGTH
const LY = LIGHT[1] / LIGHT_LENGTH
const LZ = LIGHT[2] / LIGHT_LENGTH
const HALF_LENGTH = Math.hypot(LX, LY, LZ + 1)
const HX = LX / HALF_LENGTH
const HY = LY / HALF_LENGTH
const HZ = (LZ + 1) / HALF_LENGTH

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** A fixed-light material study. Only the picked color and shading mode change. */
export function SphereShadingPreview({ study, className }: SphereShadingPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ko = useLocale() === "ko"
  const modeName = study.mode === "coldwarm" ? (ko ? "콜드웜" : "Coldwarm") : (ko ? "노멀" : "Normal")
  const description = ko
    ? `${study.base.hex} 색상의 ${modeName} 구체 셰이딩. 왼쪽 위에서 비추는 빛과 부드러운 그림자.`
    : `${modeName} sphere shading for ${study.base.hex}, lit from the upper left with a soft shadow.`

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return

    // Interpolate a small color lookup table while shading pixels; no canvas
    // readback or color-space conversion is needed inside the geometry loop.
    const ramp = new Float32Array((RAMP_STEPS + 1) * 3)
    for (let index = 0; index <= RAMP_STEPS; index++) {
      const color = sampleSphereRamp(study, index / RAMP_STEPS * 2 - 1)
      ramp[index * 3] = color.r
      ramp[index * 3 + 1] = color.g
      ramp[index * 3 + 2] = color.b
    }

    const sphereLayer = document.createElement("canvas")
    const sphereContext = sphereLayer.getContext("2d")
    if (!sphereContext) return
    const bounceChannels = [study.bounce.rgb.r, study.bounce.rgb.g, study.bounce.rgb.b]
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

      const backdrop = context.createLinearGradient(0, 0, 0, height)
      backdrop.addColorStop(0, "#252525")
      backdrop.addColorStop(0.75, "#1e1e1e")
      backdrop.addColorStop(1, "#1b1b1b")
      context.fillStyle = backdrop
      context.fillRect(0, 0, width, height)

      // A broad cast shadow extends away from the key light. The small contact
      // shadow meets the lower silhouette, grounding the sphere on the surface.
      context.save()
      context.setTransform(scale, 0, 0, scale, offsetX, offsetY)
      const shadow = (x: number, y: number, radiusX: number, radiusY: number, opacity: number) => {
        context.save()
        context.translate(x, y)
        context.scale(1, radiusY / radiusX)
        const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radiusX)
        gradient.addColorStop(0, `rgba(0,0,0,${opacity})`)
        gradient.addColorStop(0.4, `rgba(0,0,0,${opacity * 0.6})`)
        gradient.addColorStop(1, "rgba(0,0,0,0)")
        context.fillStyle = gradient
        context.beginPath()
        context.arc(0, 0, radiusX, 0, Math.PI * 2)
        context.fill()
        context.restore()
      }
      shadow(CENTER_X + 29, CENTER_Y + RADIUS + 5, 68, 12, 0.4)
      shadow(CENTER_X + 2, CENTER_Y + RADIUS + 1, 36, 4.5, 0.78)
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
        const ny = (top + y + 0.5 - centerY) / radius
        for (let x = 0; x < size; x++) {
          const nx = (left + x + 0.5 - centerX) / radius
          const distanceSquared = nx * nx + ny * ny
          const coverage = clamp((1 - Math.sqrt(distanceSquared)) * radius + 0.5, 0, 1)
          if (coverage === 0) continue

          const nz = Math.sqrt(Math.max(0, 1 - distanceSquared))
          const normalLight = nx * LX + ny * LY + nz * LZ
          // Smooth positive Lambertian irradiance approximates an area light
          // around the terminator. The broad front surface remains near base.
          const diffuse = (normalLight + Math.sqrt(normalLight * normalLight + 0.018)) / 2
          const normalHalf = Math.max(0, nx * HX + ny * HY + nz * HZ)
          const specular = Math.pow(normalHalf, 72) * 0.36 + Math.pow(normalHalf, 18) * 0.035
          const shade = clamp((diffuse - 0.575) * 1.7 + specular, -1, 1)
          const rampPosition = (shade + 1) / 2 * RAMP_STEPS
          const lower = Math.min(Math.floor(rampPosition), RAMP_STEPS - 1)
          const blend = rampPosition - lower
          const channelIndex = lower * 3

          // Dim ground bounce is strongest on downward, unlit normals, without
          // drawing an artificial rim around the edge of the ball.
          const groundFacing = Math.max(0, nx * 0.2 + ny * 0.94 + nz * 0.28)
          const bounce = Math.pow(groundFacing, 4) * (1 - clamp((normalLight + 0.15) / 0.6, 0, 1)) * 0.11
          const contact = 1 - Math.pow(Math.max(0, ny), 12) * (1 - nz) * 0.14
          const pixelIndex = (y * size + x) * 4
          for (let channel = 0; channel < 3; channel++) {
            const lit = ramp[channelIndex + channel] * (1 - blend) + ramp[channelIndex + 3 + channel] * blend
            data[pixelIndex + channel] = (lit * (1 - bounce) + bounceChannels[channel] * bounce) * contact
          }
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
    window.addEventListener("resize", scheduleRender)
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", scheduleRender)
      cancelAnimationFrame(animationFrame)
    }
  }, [study])

  return (
    <canvas
      ref={canvasRef}
      width={SCENE_WIDTH}
      height={SCENE_HEIGHT}
      className={cn("block aspect-[11/10] w-full", className)}
      role="img"
      aria-label={description}
    >
      {description}
    </canvas>
  )
}
