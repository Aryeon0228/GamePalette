"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Save, Download, RefreshCw, ArrowLeft, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ImageUploader } from "@/components/ImageUploader"
import { ImageSelector } from "@/components/ImageSelector"
import { PaletteDisplay } from "@/components/PaletteDisplay"
import { ColorVariations } from "@/components/ColorVariations"
import { StyleFilter } from "@/components/StyleFilter"
import { ExportModal } from "@/components/ExportModal"
import { ColorCountSelector } from "@/components/ColorCountSelector"
import { usePaletteStore } from "@/stores/paletteStore"
import { extractColors } from "@/lib/colorExtractor"
import { useToast } from "@/components/ui/toast"
import { generateId } from "@/lib/utils"
import Link from "next/link"

export default function CreatePage() {
  const router = useRouter()
  const { addToast } = useToast()

  const {
    currentPalette,
    originalColors,
    currentStyle,
    customSettings,
    valueCheckEnabled,
    colorCount,
    sourceImageUrl,
    extractionMethod,
    setCurrentPalette,
    setOriginalColors,
    setCurrentStyle,
    setCustomSettings,
    toggleValueCheck,
    setColorCount,
    setSourceImageUrl,
    setExtractionMethod,
    savePalette,
    getDisplayColors,
  } = usePaletteStore()

  const [paletteName, setPaletteName] = useState(currentPalette?.name || "Untitled Palette")
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  // Track the actual image used for extraction (could be cropped region)
  const [extractionImageUrl, setExtractionImageUrl] = useState<string | null>(null)
  // Track extraction request to prevent race conditions
  const extractionIdRef = useRef(0)

  const displayColors = getDisplayColors()

  // Extract colors from an image URL
  const extractFromImage = async (imageUrl: string, isRegionSelection = false) => {
    setIsExtracting(true)

    try {
      const colors = await extractColors(imageUrl, colorCount, extractionMethod)

      setOriginalColors(colors)
      setCurrentPalette({
        id: generateId(),
        name: paletteName,
        colors,
        sourceImageUrl: sourceImageUrl || imageUrl,
        style: currentStyle,
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      setSelectedColorIndex(null)
      setExtractionImageUrl(imageUrl)

      if (isRegionSelection) {
        addToast("Colors extracted from selected region", "success")
      }
    } catch (error) {
      console.error("Failed to extract colors:", error)
      addToast("Failed to extract colors from image", "error")
    } finally {
      setIsExtracting(false)
    }
  }

  // Handle initial image upload
  const handleImageLoad = async (imageUrl: string) => {
    setSourceImageUrl(imageUrl)
    setExtractionImageUrl(imageUrl)
    await extractFromImage(imageUrl)
  }

  // Handle region selection
  const handleSelectionComplete = async (croppedImageUrl: string | null) => {
    if (croppedImageUrl) {
      // Extract from the selected region
      await extractFromImage(croppedImageUrl, true)
    } else {
      // Reset to full image
      if (sourceImageUrl) {
        await extractFromImage(sourceImageUrl)
      }
    }
  }

  const handleReextract = useCallback(async () => {
    const imageToUse = extractionImageUrl || sourceImageUrl
    if (!imageToUse) return

    // Increment extraction ID to track this specific request
    const currentExtractionId = ++extractionIdRef.current

    setIsExtracting(true)
    try {
      const colors = await extractColors(imageToUse, colorCount, extractionMethod)

      // Only update state if this is still the latest extraction request
      if (currentExtractionId !== extractionIdRef.current) return

      setOriginalColors(colors)
      setCurrentPalette({
        ...currentPalette!,
        colors,
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      // Only show error if this is still the latest extraction request
      if (currentExtractionId !== extractionIdRef.current) return
      console.error("Failed to re-extract colors:", error)
      addToast("Failed to re-extract colors", "error")
    } finally {
      // Only clear loading state if this is still the latest extraction request
      if (currentExtractionId === extractionIdRef.current) {
        setIsExtracting(false)
      }
    }
  }, [extractionImageUrl, sourceImageUrl, colorCount, extractionMethod, currentPalette, setOriginalColors, setCurrentPalette, addToast])

  const handleSave = () => {
    const id = savePalette(paletteName)
    if (id) {
      addToast("Palette saved successfully", "success")
      router.push(`/palette/${id}`)
    }
  }

  const handleClearImage = () => {
    setSourceImageUrl(null)
    setExtractionImageUrl(null)
    setOriginalColors([])
    setCurrentPalette(null)
    setSelectedColorIndex(null)
  }

  // Re-extract when colorCount changes (only if we already have colors)
  useEffect(() => {
    const imageToUse = extractionImageUrl || sourceImageUrl
    if (imageToUse && originalColors.length > 0 && originalColors.length !== colorCount) {
      handleReextract()
    }
  }, [colorCount, extractionImageUrl, sourceImageUrl, originalColors.length, handleReextract])

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Input
            value={paletteName}
            onChange={(e) => setPaletteName(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none focus-visible:ring-0 w-auto"
            placeholder="Palette name"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowExportModal(true)}
            disabled={!currentPalette || displayColors.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={handleSave}
            disabled={!currentPalette || displayColors.length === 0}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Image & Style */}
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Source Image</h2>
              {/* Extraction Method Selector */}
              <div className="flex gap-1">
                <Button
                  variant={extractionMethod === 'histogram' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExtractionMethod('histogram')}
                  className="text-xs"
                >
                  Hue Histogram
                </Button>
                <Button
                  variant={extractionMethod === 'kmeans' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExtractionMethod('kmeans')}
                  className="text-xs"
                >
                  K-Means
                </Button>
              </div>
            </div>

            {!sourceImageUrl ? (
              <ImageUploader onImageLoad={handleImageLoad} />
            ) : (
              <ImageSelector
                imageUrl={sourceImageUrl}
                onSelectionComplete={handleSelectionComplete}
                onClear={handleClearImage}
              />
            )}

            {isExtracting && (
              <div className="mt-4 text-center text-muted-foreground">
                <div className="inline-block animate-spin mr-2">⏳</div>
                Extracting colors...
              </div>
            )}
          </div>

          {/* Quick Settings - 이미지 로드 후 항상 표시 */}
          {sourceImageUrl && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-medium mb-4">Quick Settings</h3>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <ColorCountSelector
                  value={colorCount}
                  onChange={setColorCount}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReextract}
                  disabled={isExtracting}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isExtracting ? 'animate-spin' : ''}`} />
                  Re-extract
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-6">
            <StyleFilter
              currentStyle={currentStyle}
              onStyleChange={setCurrentStyle}
              customSettings={customSettings}
              onCustomSettingsChange={setCustomSettings}
            />
          </div>
        </div>

        {/* Right Column - Palette & Variations */}
        <div className="space-y-6">
          {/* Palette */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Extracted Palette</h2>
            <PaletteDisplay
              colors={displayColors}
              selectedIndex={selectedColorIndex ?? undefined}
              onColorSelect={(_, index) => setSelectedColorIndex(index)}
            />
          </div>

          {/* Color Variations - directly below palette */}
          {selectedColorIndex !== null && displayColors[selectedColorIndex] && (
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-start gap-4 mb-4">
                {/* Selected Color Preview */}
                <div
                  className="w-16 h-16 rounded-lg shrink-0 ring-2 ring-primary"
                  style={{ backgroundColor: displayColors[selectedColorIndex].hex }}
                />
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold">
                    {displayColors[selectedColorIndex].name || 'Selected Color'}
                  </h2>
                  <p className="text-sm font-mono text-muted-foreground">
                    {displayColors[selectedColorIndex].hex}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    HSL: {displayColors[selectedColorIndex].hsl.h}°, {displayColors[selectedColorIndex].hsl.s}%, {displayColors[selectedColorIndex].hsl.l}%
                  </p>
                </div>
                {/* Value Check Button */}
                <Button
                  variant={valueCheckEnabled ? "secondary" : "outline"}
                  size="sm"
                  onClick={toggleValueCheck}
                  className="shrink-0"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Value Check
                </Button>
              </div>

              {/* Color Variations */}
              <ColorVariations color={displayColors[selectedColorIndex]} />
            </div>
          )}

          {/* Hint when no color selected */}
          {displayColors.length > 0 && selectedColorIndex === null && (
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center">
              <p className="text-muted-foreground">
                Click a color above to see value variations with hue shifting
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Export Modal */}
      {currentPalette && (
        <ExportModal
          open={showExportModal}
          onOpenChange={setShowExportModal}
          palette={{ ...currentPalette, name: paletteName, colors: displayColors }}
        />
      )}
    </div>
  )
}
