"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Download, Trash2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PaletteDisplay } from "@/components/PaletteDisplay"
import { ColorCard } from "@/components/ColorCard"
import { ColorVariations } from "@/components/ColorVariations"
import { StyleFilter } from "@/components/StyleFilter"
import { ExportModal } from "@/components/ExportModal"
import { usePaletteStore } from "@/stores/paletteStore"
import { applyStyleFilter, toGrayscale } from "@/lib/styleFilters"
import { useToast } from "@/components/ui/toast"
import { Palette, Color, StyleType } from "@/types"

export default function PaletteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { addToast } = useToast()
  const paletteId = params.id as string

  const { getPaletteById, updatePalette, deletePalette } = usePaletteStore()

  const [palette, setPalette] = useState<Palette | null>(null)
  const [paletteName, setPaletteName] = useState("")
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null)
  const [currentStyle, setCurrentStyle] = useState<StyleType>("original")
  const [valueCheckEnabled, setValueCheckEnabled] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [displayColors, setDisplayColors] = useState<Color[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Load palette
  useEffect(() => {
    const found = getPaletteById(paletteId)
    if (found) {
      setPalette(found)
      setPaletteName(found.name)
      setCurrentStyle(found.style)
      setDisplayColors(found.colors)
    } else {
      router.push("/library")
    }
  }, [paletteId, getPaletteById, router])

  // Apply style filter
  useEffect(() => {
    if (!palette) return

    let colors = applyStyleFilter(palette.colors, currentStyle)
    if (valueCheckEnabled) {
      colors = toGrayscale(colors)
    }
    setDisplayColors(colors)
  }, [palette, currentStyle, valueCheckEnabled])

  const handleSave = () => {
    if (!palette) return

    const updatedColors = applyStyleFilter(palette.colors, currentStyle)
    updatePalette(paletteId, {
      name: paletteName,
      colors: updatedColors,
      style: currentStyle,
    })

    setHasChanges(false)
    addToast("Palette saved successfully", "success")
  }

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this palette?")) {
      deletePalette(paletteId)
      router.push("/library")
      addToast("Palette deleted", "success")
    }
  }

  const handleStyleChange = (style: StyleType) => {
    setCurrentStyle(style)
    setHasChanges(true)
  }

  const handleNameChange = (name: string) => {
    setPaletteName(name)
    setHasChanges(true)
  }

  if (!palette) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground">Loading palette...</p>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/library">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Input
            value={paletteName}
            onChange={(e) => handleNameChange(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none focus-visible:ring-0 w-auto"
            placeholder="Palette name"
          />
          {hasChanges && (
            <span className="text-xs text-muted-foreground">(unsaved changes)</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowExportModal(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Palette Display */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Colors</h2>
              <Button
                variant={valueCheckEnabled ? "secondary" : "outline"}
                size="sm"
                onClick={() => setValueCheckEnabled(!valueCheckEnabled)}
              >
                {valueCheckEnabled ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Value Check
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Value Check
                  </>
                )}
              </Button>
            </div>
            <PaletteDisplay
              colors={displayColors}
              selectedIndex={selectedColorIndex ?? undefined}
              onColorSelect={(_, index) => setSelectedColorIndex(index)}
            />
          </div>

          {/* Source Image */}
          {palette.sourceImageUrl && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Source Image</h2>
              <img
                src={palette.sourceImageUrl}
                alt="Source"
                className="w-full max-h-80 object-contain rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Style Filter */}
          <div className="rounded-lg border border-border bg-card p-6">
            <StyleFilter
              currentStyle={currentStyle}
              onStyleChange={handleStyleChange}
            />
          </div>

          {/* Selected Color Details */}
          {selectedColorIndex !== null && displayColors[selectedColorIndex] && (
            <>
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Color Details</h2>
                <ColorCard
                  color={displayColors[selectedColorIndex]}
                  showDetails
                />
              </div>

              {/* Color Variations with Hue Shifting */}
              <div className="rounded-lg border border-border bg-card p-6">
                <ColorVariations color={displayColors[selectedColorIndex]} />
              </div>
            </>
          )}

          {/* Palette Info */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-3">
            <h2 className="text-lg font-semibold">Info</h2>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Colors</span>
                <span>{palette.colors.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Style</span>
                <span className="capitalize">{currentStyle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(palette.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{new Date(palette.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        palette={{ ...palette, name: paletteName, colors: displayColors, style: currentStyle }}
      />
    </div>
  )
}
