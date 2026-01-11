"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Crop, RotateCcw, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Selection {
  startX: number
  startY: number
  endX: number
  endY: number
}

interface ImageSelectorProps {
  imageUrl: string
  onSelectionComplete: (croppedImageUrl: string | null) => void
  onClear?: () => void
  className?: string
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
  const [selection, setSelection] = useState<Selection | null>(null)
  const [tempSelection, setTempSelection] = useState<Selection | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const [selectionMode, setSelectionMode] = useState(false)

  // Load image and set dimensions
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = "Anonymous"
    img.onload = () => {
      imageRef.current = img
      setImageLoaded(true)

      // Calculate display dimensions (fit within container)
      const container = containerRef.current
      if (container) {
        const maxWidth = container.clientWidth
        const maxHeight = 400

        let width = img.naturalWidth
        let height = img.naturalHeight

        // Scale down if needed
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
    }
    img.src = imageUrl
  }, [imageUrl])

  // Draw selection overlay
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || !imageLoaded) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const currentSelection = tempSelection || selection
    if (!currentSelection || !selectionMode) return

    const { startX, startY, endX, endY } = currentSelection
    const x = Math.min(startX, endX)
    const y = Math.min(startY, endY)
    const width = Math.abs(endX - startX)
    const height = Math.abs(endY - startY)

    // Draw dark overlay outside selection
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Clear the selection area (make it visible)
    ctx.clearRect(x, y, width, height)

    // Draw selection border
    ctx.strokeStyle = "#6366F1"
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.strokeRect(x, y, width, height)

    // Draw corner handles
    const handleSize = 8
    ctx.fillStyle = "#6366F1"
    ctx.setLineDash([])

    // Corners
    const corners = [
      { cx: x, cy: y },
      { cx: x + width, cy: y },
      { cx: x, cy: y + height },
      { cx: x + width, cy: y + height },
    ]

    corners.forEach(({ cx, cy }) => {
      ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize)
    })

    // Draw dimensions text
    if (width > 50 && height > 20) {
      ctx.fillStyle = "rgba(99, 102, 241, 0.9)"
      ctx.fillRect(x + width / 2 - 30, y + height / 2 - 10, 60, 20)
      ctx.fillStyle = "white"
      ctx.font = "12px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(`${Math.round(width)}×${Math.round(height)}`, x + width / 2, y + height / 2 + 4)
    }
  }, [selection, tempSelection, imageLoaded, selectionMode])

  const getMousePosition = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }

      const rect = canvas.getBoundingClientRect()
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    },
    []
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!selectionMode) return
      const { x, y } = getMousePosition(e)
      setIsSelecting(true)
      setTempSelection({ startX: x, startY: y, endX: x, endY: y })
      setSelection(null)
    },
    [getMousePosition, selectionMode]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isSelecting || !selectionMode) return
      const { x, y } = getMousePosition(e)
      setTempSelection((prev) =>
        prev ? { ...prev, endX: x, endY: y } : null
      )
    },
    [isSelecting, getMousePosition, selectionMode]
  )

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !tempSelection) return
    setIsSelecting(false)

    // Check if selection is too small
    const width = Math.abs(tempSelection.endX - tempSelection.startX)
    const height = Math.abs(tempSelection.endY - tempSelection.startY)

    if (width > 10 && height > 10) {
      setSelection(tempSelection)
    }
    setTempSelection(null)
  }, [isSelecting, tempSelection])

  const handleConfirmSelection = useCallback(() => {
    if (!selection || !imageRef.current) return

    const img = imageRef.current

    // Calculate scale factor between displayed size and actual image size
    const scaleX = img.naturalWidth / imageDimensions.width
    const scaleY = img.naturalHeight / imageDimensions.height

    // Get selection coordinates in actual image pixels
    const x = Math.min(selection.startX, selection.endX) * scaleX
    const y = Math.min(selection.startY, selection.endY) * scaleY
    const width = Math.abs(selection.endX - selection.startX) * scaleX
    const height = Math.abs(selection.endY - selection.startY) * scaleY

    // Create a canvas to crop the image
    const cropCanvas = document.createElement("canvas")
    cropCanvas.width = width
    cropCanvas.height = height
    const ctx = cropCanvas.getContext("2d")

    if (ctx) {
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height)
      const croppedUrl = cropCanvas.toDataURL("image/png")
      onSelectionComplete(croppedUrl)
    }

    setSelectionMode(false)
  }, [selection, imageDimensions, onSelectionComplete])

  const handleClearSelection = useCallback(() => {
    setSelection(null)
    setTempSelection(null)
    onSelectionComplete(null)
  }, [onSelectionComplete])

  const handleClearImage = useCallback(() => {
    setSelection(null)
    setTempSelection(null)
    setSelectionMode(false)
    onClear?.()
  }, [onClear])

  return (
    <div className={cn("space-y-4", className)}>
      {/* Image Container */}
      <div
        ref={containerRef}
        className="relative rounded-lg overflow-hidden border border-border bg-black/20"
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

        {/* Selection Canvas Overlay */}
        {imageLoaded && selectionMode && (
          <canvas
            ref={canvasRef}
            width={imageDimensions.width}
            height={imageDimensions.height}
            className="absolute top-0 left-0 cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        )}

        {/* Selection Mode Indicator */}
        {selectionMode && !selection && (
          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
            Drag to select region
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!selectionMode ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectionMode(true)}
            >
              <Crop className="h-4 w-4 mr-2" />
              Select Region
            </Button>
          ) : (
            <>
              {selection ? (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleConfirmSelection}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Extract from Selection
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearSelection}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectionMode(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </>
          )}
        </div>

        {onClear && (
          <Button variant="destructive" size="sm" onClick={handleClearImage}>
            <X className="h-4 w-4 mr-2" />
            Clear Image
          </Button>
        )}
      </div>

      {/* Selection Info */}
      {selection && selectionMode && (
        <p className="text-xs text-muted-foreground text-center">
          Selection ready. Click &quot;Extract from Selection&quot; to extract colors from the selected area only.
        </p>
      )}
    </div>
  )
}
