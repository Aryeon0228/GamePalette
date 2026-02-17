"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  IoCropOutline,
  IoBrushOutline,
  IoRefreshOutline,
  IoCheckmarkOutline,
  IoCloseOutline,
} from "react-icons/io5"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RectSelection {
  startX: number
  startY: number
  endX: number
  endY: number
}

interface Point {
  x: number
  y: number
}

type SelectionShape = "rect" | "lasso"

interface ImageSelectorProps {
  imageUrl: string
  onSelectionComplete: (croppedImageUrl: string | null) => void
  onClear?: () => void
  className?: string
}

const MIN_RECT_SIZE = 10
const MIN_LASSO_POINTS = 8
const MIN_LASSO_AREA = 180

function getPolygonArea(points: Point[]): number {
  if (points.length < 3) return 0
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]
    sum += p1.x * p2.y - p2.x * p1.y
  }
  return Math.abs(sum / 2)
}

export function ImageSelector({
  imageUrl,
  onSelectionComplete,
  onClear,
  className,
}: ImageSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionShape, setSelectionShape] = useState<SelectionShape>("rect")
  const [rectSelection, setRectSelection] = useState<RectSelection | null>(null)
  const [tempRectSelection, setTempRectSelection] = useState<RectSelection | null>(null)
  const [lassoSelection, setLassoSelection] = useState<Point[]>([])
  const [tempLassoSelection, setTempLassoSelection] = useState<Point[]>([])
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const [selectionMode, setSelectionMode] = useState(false)

  const activeRectSelection = tempRectSelection || rectSelection
  const activeLassoSelection = tempLassoSelection.length > 0 ? tempLassoSelection : lassoSelection
  const hasSelection =
    selectionShape === "rect" ? !!activeRectSelection : activeLassoSelection.length >= 3

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = "Anonymous"
    const updateDimensions = () => {
      if (!containerRef.current || !img.naturalWidth || !img.naturalHeight) return
      imageRef.current = img
      setImageLoaded(true)

      const maxWidth = containerRef.current.clientWidth
      const maxHeight = 400

      let width = img.naturalWidth
      let height = img.naturalHeight

      if (width > maxWidth) {
        height = (maxWidth / width) * height
        width = maxWidth
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width
        height = maxHeight
      }

      setImageDimensions({ width, height })
    }

    img.onload = () => {
      updateDimensions()
      window.addEventListener("resize", updateDimensions)
    }
    img.src = imageUrl

    return () => {
      window.removeEventListener("resize", updateDimensions)
    }
  }, [imageUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || !imageLoaded) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!selectionMode) return

    const drawRectSelection = (selection: RectSelection) => {
      const { startX, startY, endX, endY } = selection
      const x = Math.min(startX, endX)
      const y = Math.min(startY, endY)
      const width = Math.abs(endX - startX)
      const height = Math.abs(endY - startY)

      ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.clearRect(x, y, width, height)

      ctx.strokeStyle = "#4f7bb8"
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(x, y, width, height)

      const handleSize = 8
      ctx.fillStyle = "#4f7bb8"
      ctx.setLineDash([])

      const corners = [
        { cx: x, cy: y },
        { cx: x + width, cy: y },
        { cx: x, cy: y + height },
        { cx: x + width, cy: y + height },
      ]

      corners.forEach(({ cx, cy }) => {
        ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize)
      })

      if (width > 50 && height > 20) {
        ctx.fillStyle = "rgba(79, 123, 184, 0.95)"
        ctx.fillRect(x + width / 2 - 30, y + height / 2 - 10, 60, 20)
        ctx.fillStyle = "white"
        ctx.font = "12px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(`${Math.round(width)}×${Math.round(height)}`, x + width / 2, y + height / 2 + 4)
      }
    }

    const drawLassoSelection = (points: Point[]) => {
      if (points.length < 2) return

      ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      if (points.length >= 3) {
        ctx.save()
        ctx.globalCompositeOperation = "destination-out"
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y)
        }
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }

      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      if (points.length >= 3) {
        ctx.closePath()
      }
      ctx.strokeStyle = "#4f7bb8"
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.stroke()

      ctx.setLineDash([])
      ctx.fillStyle = "#4f7bb8"
      for (const point of points) {
        ctx.fillRect(point.x - 2, point.y - 2, 4, 4)
      }
    }

    if (selectionShape === "rect" && activeRectSelection) {
      drawRectSelection(activeRectSelection)
    } else if (selectionShape === "lasso") {
      drawLassoSelection(activeLassoSelection)
    }
  }, [
    activeLassoSelection,
    activeRectSelection,
    imageLoaded,
    isSelecting,
    selectionMode,
    selectionShape,
  ])

  const getPointerPosition = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: Math.min(Math.max(0, event.clientX - rect.left), canvas.width),
      y: Math.min(Math.max(0, event.clientY - rect.top), canvas.height),
    }
  }, [])

  const resetAllSelections = useCallback(() => {
    setRectSelection(null)
    setTempRectSelection(null)
    setLassoSelection([])
    setTempLassoSelection([])
  }, [])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!selectionMode) return

      const canvas = canvasRef.current
      if (!canvas) return

      const point = getPointerPosition(event)
      setIsSelecting(true)
      if (selectionShape === "rect") {
        setTempRectSelection({
          startX: point.x,
          startY: point.y,
          endX: point.x,
          endY: point.y,
        })
        setRectSelection(null)
      } else {
        setTempLassoSelection([point])
        setLassoSelection([])
      }

      canvas.setPointerCapture(event.pointerId)
    },
    [getPointerPosition, selectionMode, selectionShape]
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!selectionMode || !isSelecting) return
      const point = getPointerPosition(event)

      if (selectionShape === "rect") {
        setTempRectSelection((prev) =>
          prev
            ? {
                ...prev,
                endX: point.x,
                endY: point.y,
              }
            : null
        )
      } else {
        setTempLassoSelection((prev) => {
          if (prev.length === 0) return [point]
          const last = prev[prev.length - 1]
          const dx = point.x - last.x
          const dy = point.y - last.y
          const distanceSquared = dx * dx + dy * dy
          if (distanceSquared < 16) return prev
          return [...prev, point]
        })
      }
    },
    [getPointerPosition, isSelecting, selectionMode, selectionShape]
  )

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!selectionMode || !isSelecting) return

      setIsSelecting(false)
      if (selectionShape === "rect") {
        setTempRectSelection((prev) => {
          if (!prev) return null
          const width = Math.abs(prev.endX - prev.startX)
          const height = Math.abs(prev.endY - prev.startY)
          if (width > MIN_RECT_SIZE && height > MIN_RECT_SIZE) {
            setRectSelection(prev)
          }
          return null
        })
      } else {
        setTempLassoSelection((prev) => {
          if (prev.length >= MIN_LASSO_POINTS && getPolygonArea(prev) >= MIN_LASSO_AREA) {
            setLassoSelection(prev)
          }
          return []
        })
      }

      const canvas = canvasRef.current
      if (canvas?.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
    },
    [isSelecting, selectionMode, selectionShape]
  )

  const handleConfirmSelection = useCallback(() => {
    if (!imageRef.current || imageDimensions.width === 0 || imageDimensions.height === 0) return

    const img = imageRef.current
    const scaleX = img.naturalWidth / imageDimensions.width
    const scaleY = img.naturalHeight / imageDimensions.height

    if (selectionShape === "rect" && rectSelection) {
      const x = Math.min(rectSelection.startX, rectSelection.endX) * scaleX
      const y = Math.min(rectSelection.startY, rectSelection.endY) * scaleY
      const width = Math.max(1, Math.round(Math.abs(rectSelection.endX - rectSelection.startX) * scaleX))
      const height = Math.max(1, Math.round(Math.abs(rectSelection.endY - rectSelection.startY) * scaleY))

      const cropCanvas = document.createElement("canvas")
      cropCanvas.width = width
      cropCanvas.height = height
      const ctx = cropCanvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(img, x, y, width, height, 0, 0, width, height)
        onSelectionComplete(cropCanvas.toDataURL("image/png"))
      }
    }

    if (selectionShape === "lasso" && lassoSelection.length >= 3) {
      const sourcePoints = lassoSelection.map((point) => ({
        x: Math.max(0, Math.min(img.naturalWidth, point.x * scaleX)),
        y: Math.max(0, Math.min(img.naturalHeight, point.y * scaleY)),
      }))

      const minX = Math.floor(Math.min(...sourcePoints.map((p) => p.x)))
      const minY = Math.floor(Math.min(...sourcePoints.map((p) => p.y)))
      const maxX = Math.ceil(Math.max(...sourcePoints.map((p) => p.x)))
      const maxY = Math.ceil(Math.max(...sourcePoints.map((p) => p.y)))
      const width = Math.max(1, maxX - minX)
      const height = Math.max(1, maxY - minY)

      const cropCanvas = document.createElement("canvas")
      cropCanvas.width = width
      cropCanvas.height = height
      const ctx = cropCanvas.getContext("2d")

      if (ctx) {
        ctx.clearRect(0, 0, width, height)
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(sourcePoints[0].x - minX, sourcePoints[0].y - minY)
        for (let i = 1; i < sourcePoints.length; i++) {
          ctx.lineTo(sourcePoints[i].x - minX, sourcePoints[i].y - minY)
        }
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(img, -minX, -minY)
        ctx.restore()
        onSelectionComplete(cropCanvas.toDataURL("image/png"))
      }
    }

    resetAllSelections()
    setSelectionMode(false)
  }, [imageDimensions, lassoSelection, onSelectionComplete, rectSelection, resetAllSelections, selectionShape])

  const handleClearSelection = useCallback(() => {
    resetAllSelections()
    onSelectionComplete(null)
  }, [onSelectionComplete, resetAllSelections])

  const handleClearImage = useCallback(() => {
    resetAllSelections()
    setSelectionMode(false)
    setIsSelecting(false)
    onClear?.()
  }, [onClear, resetAllSelections])

  const handleStartSelectionMode = useCallback(() => {
    resetAllSelections()
    setSelectionMode(true)
  }, [resetAllSelections])

  const handleCancelSelectionMode = useCallback(() => {
    resetAllSelections()
    setSelectionMode(false)
    setIsSelecting(false)
  }, [resetAllSelections])

  return (
    <div className={cn("space-y-4", className)}>
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden border border-[#2d2d38] bg-[#101018]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Source"
          className="w-full h-auto max-h-[400px] object-contain"
          style={{
            width: imageDimensions.width || "auto",
            height: imageDimensions.height || "auto",
          }}
        />

        {imageLoaded && selectionMode && (
          <canvas
            ref={canvasRef}
            width={imageDimensions.width}
            height={imageDimensions.height}
            className="absolute top-0 left-0 cursor-crosshair touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        )}

        {selectionMode && !hasSelection && (
          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-lg">
            {selectionShape === "rect" ? "Drag to select a rectangle" : "Draw a freeform lasso path"}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!selectionMode ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartSelectionMode}
            >
              <IoCropOutline className="h-4 w-4 mr-2" />
              Select Region
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-1 rounded-lg border border-border p-1">
                <Button
                  variant={selectionShape === "rect" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    resetAllSelections()
                    setSelectionShape("rect")
                  }}
                >
                  <IoCropOutline className="h-4 w-4 mr-2" />
                  Rect
                </Button>
                <Button
                  variant={selectionShape === "lasso" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    resetAllSelections()
                    setSelectionShape("lasso")
                  }}
                >
                  <IoBrushOutline className="h-4 w-4 mr-2" />
                  Lasso
                </Button>
              </div>

              {hasSelection ? (
                <Button variant="default" size="sm" onClick={handleConfirmSelection}>
                  <IoCheckmarkOutline className="h-4 w-4 mr-2" />
                  Extract from Selection
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={handleCancelSelectionMode}>
                  <IoCloseOutline className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}

              {hasSelection && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSelection}
                >
                  <IoRefreshOutline className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              )}
            </>
          )}
        </div>

        {onClear && (
          <Button variant="destructive" size="sm" onClick={handleClearImage}>
            <IoCloseOutline className="h-4 w-4 mr-2" />
            Clear Image
          </Button>
        )}
      </div>

      {hasSelection && selectionMode && (
        <p className="text-xs text-muted-foreground text-center">
          Selection ready. Click &quot;Extract from Selection&quot; to extract colors from the selected area only.
        </p>
      )}
    </div>
  )
}
