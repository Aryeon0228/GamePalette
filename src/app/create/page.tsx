"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IoSaveOutline,
  IoDownloadOutline,
  IoRefreshOutline,
  IoArrowBackOutline,
  IoEyeOutline,
  IoSettingsOutline,
  IoInformationCircleOutline,
} from "react-icons/io5"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ImageUploader } from "@/components/ImageUploader"
import { ImageSelector } from "@/components/ImageSelector"
import { PaletteDisplay } from "@/components/PaletteDisplay"
import { StyleFilter } from "@/components/StyleFilter"
import { ExportModal } from "@/components/ExportModal"
import { ColorCountSelector } from "@/components/ColorCountSelector"
import { AdvancedSettingsModal } from "@/components/AdvancedSettingsModal"
import { ColorDetailModal } from "@/components/ColorDetailModal"
import { usePaletteStore } from "@/stores/paletteStore"
import { extractColors } from "@/lib/colorExtractor"
import { useToast } from "@/components/ui/toast"
import { generateId } from "@/lib/utils"

export default function CreatePage() {
  const router = useRouter()
  const { addToast } = useToast()

  const {
    currentPalette,
    currentStyle,
    customSettings,
    valueCheckEnabled,
    colorBlindMode,
    colorCount,
    sourceImageUrl,
    extractionMethod,
    setCurrentPalette,
    setOriginalColors,
    setCurrentStyle,
    setCustomSettings,
    toggleValueCheck,
    setColorBlindMode,
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
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [showColorDetail, setShowColorDetail] = useState(false)
  const [extractionImageUrl, setExtractionImageUrl] = useState<string | null>(null)
  const extractionIdRef = useRef(0)

  const displayColors = getDisplayColors()
  const selectedColor =
    selectedColorIndex !== null && displayColors[selectedColorIndex] ? displayColors[selectedColorIndex] : null

  useEffect(() => {
    if (selectedColorIndex !== null && selectedColorIndex >= displayColors.length) {
      setSelectedColorIndex(null)
    }
  }, [displayColors.length, selectedColorIndex])

  const extractFromImage = async (imageUrl: string, isRegionSelection = false) => {
    setIsExtracting(true)

    try {
      const colors = await extractColors(imageUrl, colorCount, extractionMethod)
      const now = new Date().toISOString()

      setOriginalColors(colors)
      setCurrentPalette({
        id: currentPalette?.id || generateId(),
        name: paletteName,
        colors,
        sourceImageUrl: sourceImageUrl || imageUrl,
        style: currentStyle,
        tags: currentPalette?.tags || [],
        createdAt: currentPalette?.createdAt || now,
        updatedAt: now,
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

  const handleImageLoad = async (imageUrl: string) => {
    setSourceImageUrl(imageUrl)
    setExtractionImageUrl(imageUrl)
    await extractFromImage(imageUrl)
  }

  const handleSelectionComplete = async (croppedImageUrl: string | null) => {
    if (croppedImageUrl) {
      await extractFromImage(croppedImageUrl, true)
    } else if (sourceImageUrl) {
      await extractFromImage(sourceImageUrl)
    }
  }

  const handleReextract = useCallback(async () => {
    const imageToUse = extractionImageUrl || sourceImageUrl
    if (!imageToUse) return

    const currentExtractionId = ++extractionIdRef.current
    setIsExtracting(true)

    try {
      const colors = await extractColors(imageToUse, colorCount, extractionMethod)
      if (currentExtractionId !== extractionIdRef.current) return

      setOriginalColors(colors)
      const now = new Date().toISOString()

      if (currentPalette) {
        setCurrentPalette({
          ...currentPalette,
          colors,
          updatedAt: now,
        })
      } else {
        setCurrentPalette({
          id: generateId(),
          name: paletteName,
          colors,
          sourceImageUrl: sourceImageUrl || imageToUse,
          style: currentStyle,
          tags: [],
          createdAt: now,
          updatedAt: now,
        })
      }
    } catch (error) {
      if (currentExtractionId !== extractionIdRef.current) return
      console.error("Failed to re-extract colors:", error)
      addToast("Failed to re-extract colors", "error")
    } finally {
      if (currentExtractionId === extractionIdRef.current) {
        setIsExtracting(false)
      }
    }
  }, [
    addToast,
    colorCount,
    currentPalette,
    currentStyle,
    extractionImageUrl,
    extractionMethod,
    paletteName,
    setCurrentPalette,
    setOriginalColors,
    sourceImageUrl,
  ])

  const handleReextractRef = useRef(handleReextract)
  useEffect(() => {
    handleReextractRef.current = handleReextract
  }, [handleReextract])

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

  const prevColorCountRef = useRef(colorCount)
  useEffect(() => {
    if (prevColorCountRef.current !== colorCount) {
      prevColorCountRef.current = colorCount
      handleReextractRef.current()
    }
  }, [colorCount])

  const prevExtractionMethodRef = useRef(extractionMethod)
  useEffect(() => {
    if (prevExtractionMethodRef.current !== extractionMethod) {
      prevExtractionMethodRef.current = extractionMethod
      handleReextractRef.current()
    }
  }, [extractionMethod])

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <IoArrowBackOutline className="h-5 w-5" />
            </Link>
          </Button>
          <Input
            value={paletteName}
            onChange={(event) => setPaletteName(event.target.value)}
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
            <IoDownloadOutline className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={handleSave}
            disabled={!currentPalette || displayColors.length === 0}
          >
            <IoSaveOutline className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">Source Image</h2>
              <div className="flex gap-1">
                <Button
                  variant={extractionMethod === "histogram" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExtractionMethod("histogram")}
                  className="text-xs"
                >
                  Hue Histogram
                </Button>
                <Button
                  variant={extractionMethod === "kmeans" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExtractionMethod("kmeans")}
                  className="text-xs"
                >
                  K-Means
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedSettings(true)}
                  className="text-xs"
                >
                  <IoSettingsOutline className="h-3.5 w-3.5 mr-1.5" />
                  Advanced
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

          {sourceImageUrl && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-medium mb-4">Quick Settings</h3>

              <div className="flex items-center justify-between flex-wrap gap-3">
                <ColorCountSelector value={colorCount} onChange={setColorCount} />
                <div className="flex gap-2">
                  <Button
                    variant={valueCheckEnabled ? "secondary" : "outline"}
                    size="sm"
                    onClick={toggleValueCheck}
                  >
                    <IoEyeOutline className="h-4 w-4 mr-2" />
                    Value Check
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReextract}
                    disabled={isExtracting}
                  >
                    <IoRefreshOutline className={`h-4 w-4 mr-2 ${isExtracting ? "animate-spin" : ""}`} />
                    Re-extract
                  </Button>
                </div>
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

        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Extracted Palette</h2>
              {selectedColor && (
                <Button size="sm" variant="outline" onClick={() => setShowColorDetail(true)}>
                  <IoInformationCircleOutline className="h-4 w-4 mr-1.5" />
                  Color Detail
                </Button>
              )}
            </div>
            <PaletteDisplay
              colors={displayColors}
              selectedIndex={selectedColorIndex ?? undefined}
              onColorSelect={(_, index) => setSelectedColorIndex(index)}
            />
          </div>

          {selectedColor && (
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-lg shrink-0 ring-2 ring-primary"
                  style={{ backgroundColor: selectedColor.hex }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Selected Color</p>
                  <h3 className="text-lg font-semibold truncate">{selectedColor.name || selectedColor.hex}</h3>
                  <p className="text-sm font-mono text-muted-foreground">{selectedColor.hex.toUpperCase()}</p>
                </div>
                <Button onClick={() => setShowColorDetail(true)}>Open Detail</Button>
              </div>
            </div>
          )}

          {displayColors.length > 0 && !selectedColor && (
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center">
              <p className="text-muted-foreground">
                Click a color above to inspect formats, variations, and harmonies.
              </p>
            </div>
          )}
        </div>
      </div>

      {currentPalette && (
        <ExportModal
          open={showExportModal}
          onOpenChange={setShowExportModal}
          palette={{ ...currentPalette, name: paletteName, colors: displayColors }}
        />
      )}

      <AdvancedSettingsModal
        open={showAdvancedSettings}
        onOpenChange={setShowAdvancedSettings}
        currentStyle={currentStyle}
        onStyleChange={setCurrentStyle}
        extractionMethod={extractionMethod}
        onExtractionMethodChange={setExtractionMethod}
        colorCount={colorCount}
        onColorCountChange={setColorCount}
        valueCheckEnabled={valueCheckEnabled}
        onValueCheckToggle={toggleValueCheck}
        colorBlindMode={colorBlindMode}
        onColorBlindModeChange={setColorBlindMode}
      />

      <ColorDetailModal
        open={showColorDetail}
        onOpenChange={setShowColorDetail}
        color={selectedColor}
      />
    </div>
  )
}
