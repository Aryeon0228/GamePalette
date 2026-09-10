"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import Image from "next/image"
import {
  IoArrowBackOutline,
  IoSaveOutline,
  IoDownloadOutline,
  IoTrashOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoCreateOutline,
} from "react-icons/io5"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PaletteDisplay } from "@/components/PaletteDisplay"
import { ColorVariations } from "@/components/ColorVariations"
import { StyleFilter } from "@/components/StyleFilter"
import { ExportModal } from "@/components/ExportModal"
import { usePaletteStore } from "@/stores/paletteStore"
import { applyStyleFilter, defaultCustomSettings, toGrayscale } from "@/lib/styleFilters"
import { useToast } from "@/components/ui/toast"
import { Palette, StyleType, CustomStyleSettings } from "@/types"

export default function PaletteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { addToast } = useToast()
  const t = useTranslations("palette")
  const ts = useTranslations("styles")
  const ko = useLocale() === "ko"
  const paletteId = params.id as string

  const { getPaletteById, updatePalette, deletePalette } = usePaletteStore()

  const [palette, setPalette] = useState<Palette | null>(null)
  const [paletteName, setPaletteName] = useState("")
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null)
  const [currentStyle, setCurrentStyle] = useState<StyleType>("original")
  const [valueCheckEnabled, setValueCheckEnabled] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [customSettings, setCustomSettings] = useState<CustomStyleSettings>(defaultCustomSettings)
  const [hasChanges, setHasChanges] = useState(false)

  // Library colors already include their saved style. Each adjustment in this
  // editing session starts from those exact colors, never from its own preview.
  const editedColors = useMemo(
    () => palette ? applyStyleFilter(palette.colors, currentStyle, customSettings) : [],
    [palette, currentStyle, customSettings]
  )
  const displayColors = useMemo(
    () => valueCheckEnabled ? toGrayscale(editedColors) : editedColors,
    [editedColors, valueCheckEnabled]
  )

  useEffect(() => {
    const found = getPaletteById(paletteId)
    if (!found) {
      router.push("/library")
      return
    }

    setPalette(found)
    setPaletteName(found.name)
    setCurrentStyle("original")
    setCustomSettings(defaultCustomSettings)
    setHasChanges(false)
    setSelectedColorIndex(null)
  }, [paletteId, getPaletteById, router])

  const handleSave = () => {
    if (!palette) return

    updatePalette(paletteId, {
      name: paletteName,
      colors: editedColors,
      style: currentStyle === "original" ? palette.style : currentStyle,
    })

    setPalette(getPaletteById(paletteId) ?? palette)
    setCurrentStyle("original")
    setHasChanges(false)
    addToast(t("saved"), "success")
  }

  const handleDelete = () => {
    if (confirm(t("deleteConfirm"))) {
      deletePalette(paletteId)
      router.push("/library")
      addToast(t("deleted"), "success")
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

  const handleOpenWorkspace = () => {
    if (!palette) return
    const state = usePaletteStore.getState()
    state.resetCurrentPalette()
    state.setOriginalColors(editedColors)
    state.setCurrentPalette({
      ...palette,
      name: paletteName,
      colors: editedColors,
      style: currentStyle === "original" ? palette.style : currentStyle,
    })
    state.setSourceImageUrl(palette.sourceImageUrl ?? null)
    state.setColorBlindMode("none")
    router.push("/create")
  }

  if (!palette) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground">{t("loading")}</p>
      </div>
    )
  }

  const selectedColor =
    selectedColorIndex !== null && displayColors[selectedColorIndex]
      ? displayColors[selectedColorIndex]
      : null

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div className="flex items-center space-x-4 min-w-0">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/library" aria-label={ko ? "라이브러리로 돌아가기" : "Back to library"}>
              <IoArrowBackOutline className="h-5 w-5" />
            </Link>
          </Button>
          <Input
            value={paletteName}
            onChange={(event) => handleNameChange(event.target.value)}
            className="text-lg font-semibold bg-transparent border-none focus-visible:ring-0 w-auto max-w-full"
            placeholder={t("paletteNamePlaceholder")}
            aria-label={t("paletteNamePlaceholder")}
          />
          {hasChanges && (
            <span className="text-xs text-muted-foreground">{t("unsaved")}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleDelete} aria-label={ko ? "팔레트 삭제" : "Delete palette"}>
            <IoTrashOutline className="h-5 w-5" />
          </Button>
          <Button variant="outline" onClick={handleOpenWorkspace}>
            <IoCreateOutline className="h-4 w-4 mr-2" />
            {ko ? "Color Lab에서 편집" : "Edit in Color Lab"}
          </Button>
          <Button variant="outline" onClick={() => setShowExportModal(true)}>
            <IoDownloadOutline className="h-4 w-4 mr-2" />
            {t("export")}
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <IoSaveOutline className="h-4 w-4 mr-2" />
            {t("save")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t("colors")}</h2>
              <Button
                variant={valueCheckEnabled ? "secondary" : "outline"}
                size="sm"
                onClick={() => setValueCheckEnabled((value) => !value)}
              >
                {valueCheckEnabled ? (
                  <>
                    <IoEyeOffOutline className="h-4 w-4 mr-2" />
                    {t("hideValueCheck")}
                  </>
                ) : (
                  <>
                    <IoEyeOutline className="h-4 w-4 mr-2" />
                    {t("valueCheck")}
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

          {selectedColor && (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-16 h-16 rounded-lg shrink-0 ring-2 ring-primary"
                  style={{ backgroundColor: selectedColor.hex }}
                />
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold">{selectedColor.name || t("selectedColor")}</h2>
                  <p className="text-sm font-mono text-muted-foreground">{selectedColor.hex}</p>
                  <p className="text-xs text-muted-foreground">
                    HSL: {selectedColor.hsl.h}°, {selectedColor.hsl.s}%, {selectedColor.hsl.l}%
                  </p>
                </div>
              </div>
              <ColorVariations color={selectedColor} />
            </div>
          )}

          {displayColors.length > 0 && !selectedColor && (
            <div className="rounded-xl border-2 border-dashed border-muted-foreground/25 p-6 text-center bg-card/70">
              <p className="text-muted-foreground">
                {t("variationHint")}
              </p>
            </div>
          )}

          {palette.sourceImageUrl && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">{t("sourceImage")}</h2>
              <Image
                src={palette.sourceImageUrl}
                alt="Source"
                width={800}
                height={320}
                className="w-full max-h-80 object-contain rounded-lg bg-background"
                unoptimized
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="mb-4 text-xs text-muted-foreground">{ko ? "저장된 색상을 기준으로 스타일을 조정합니다." : "Adjust the style from the saved colors."}</p>
            <StyleFilter
              currentStyle={currentStyle}
              onStyleChange={handleStyleChange}
              customSettings={customSettings}
              onCustomSettingsChange={(settings) => { setCustomSettings(settings); setHasChanges(true) }}
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h2 className="text-lg font-semibold">{t("info")}</h2>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("colors")}</span>
                <span>{palette.colors.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("style")}</span>
                <span>{ts(currentStyle === "original" ? palette.style : currentStyle)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("created")}</span>
                <span>{new Date(palette.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("updated")}</span>
                <span>{new Date(palette.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ExportModal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        palette={{ ...palette, name: paletteName, colors: editedColors, style: currentStyle === "original" ? palette.style : currentStyle }}
      />
    </div>
  )
}
