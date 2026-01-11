"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Save, Download, RefreshCw, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ImageUploader } from "@/components/ImageUploader"
import { PaletteDisplay } from "@/components/PaletteDisplay"
import { ColorCard } from "@/components/ColorCard"
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
    setCurrentPalette,
    setOriginalColors,
    setCurrentStyle,
    setCustomSettings,
    toggleValueCheck,
    setColorCount,
    setSourceImageUrl,
    savePalette,
    getDisplayColors,
  } = usePaletteStore()

  const [paletteName, setPaletteName] = useState(currentPalette?.name || "Untitled Palette")
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

  const displayColors = getDisplayColors()

  const handleImageLoad = async (imageUrl: string) => {
    setIsExtracting(true)
    setSourceImageUrl(imageUrl)

    try {
      const colors = await extractColors(imageUrl, colorCount)

      setOriginalColors(colors)
      setCurrentPalette({
        id: generateId(),
        name: paletteName,
        colors,
        sourceImageUrl: imageUrl,
        style: currentStyle,
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      setSelectedColorIndex(null)
    } catch (error) {
      console.error("Failed to extract colors:", error)
      addToast("Failed to extract colors from image", "error")
    } finally {
      setIsExtracting(false)
    }
  }

  const handleReextract = async () => {
    if (!sourceImageUrl) return

    setIsExtracting(true)
    try {
      const colors = await extractColors(sourceImageUrl, colorCount)
      setOriginalColors(colors)
      setCurrentPalette({
        ...currentPalette!,
        colors,
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Failed to re-extract colors:", error)
      addToast("Failed to re-extract colors", "error")
    } finally {
      setIsExtracting(false)
    }
  }

  const handleSave = () => {
    const id = savePalette(paletteName)
    if (id) {
      addToast("Palette saved successfully", "success")
      router.push(`/palette/${id}`)
    }
  }

  const handleClearImage = () => {
    setSourceImageUrl(null)
    setOriginalColors([])
    setCurrentPalette(null)
    setSelectedColorIndex(null)
  }

  // Update color count effect - only trigger on colorCount change
  useEffect(() => {
    if (sourceImageUrl && originalColors.length > 0 && originalColors.length !== colorCount) {
      handleReextract()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorCount])

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
        {/* Left Column - Image */}
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Source Image</h2>
            <ImageUploader
              onImageLoad={handleImageLoad}
              currentImage={sourceImageUrl}
              onClear={handleClearImage}
            />

            {sourceImageUrl && (
              <div className="mt-4 flex items-center justify-between">
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
            )}
          </div>

          {/* Selected Color Details */}
          {selectedColorIndex !== null && displayColors[selectedColorIndex] && (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Selected Color</h2>
                <ColorCard
                  color={displayColors[selectedColorIndex]}
                  showDetails
                />
              </div>

              {/* Color Variations with Hue Shifting */}
              <div className="rounded-lg border border-border bg-card p-6">
                <ColorVariations color={displayColors[selectedColorIndex]} />
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Palette */}
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Extracted Palette</h2>
            <PaletteDisplay
              colors={displayColors}
              selectedIndex={selectedColorIndex ?? undefined}
              onColorSelect={(_, index) => setSelectedColorIndex(index)}
            />
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <StyleFilter
              currentStyle={currentStyle}
              onStyleChange={setCurrentStyle}
              customSettings={customSettings}
              onCustomSettingsChange={setCustomSettings}
              valueCheckEnabled={valueCheckEnabled}
              onValueCheckToggle={toggleValueCheck}
            />
          </div>
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
