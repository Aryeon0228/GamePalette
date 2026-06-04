"use client"

import { useTranslations } from "next-intl"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ColorCountSelector } from "@/components/ColorCountSelector"
import { StyleType } from "@/types"
import { ExtractionMethod } from "@/lib/colorExtractor"
import { IconType } from "react-icons"
import {
  IoPawOutline,
  IoSparklesOutline,
  IoBrushOutline,
  IoEyeOutline,
  IoOptionsOutline,
  IoStatsChartOutline,
  IoColorFilterOutline,
} from "react-icons/io5"
import {
  COLOR_BLINDNESS_OPTIONS,
  ColorBlindnessType,
} from "@/lib/colorVision"

interface AdvancedSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentStyle: StyleType
  onStyleChange: (style: StyleType) => void
  extractionMethod: ExtractionMethod
  onExtractionMethodChange: (method: ExtractionMethod) => void
  colorCount: number
  onColorCountChange: (count: number) => void
  valueCheckEnabled: boolean
  onValueCheckToggle: () => void
  colorBlindMode: ColorBlindnessType
  onColorBlindModeChange: (mode: ColorBlindnessType) => void
}

const styleButtons: Array<{ id: StyleType; labelKey: string; icon: IconType }> = [
  { id: "original", labelKey: "original", icon: IoPawOutline },
  { id: "hypercasual", labelKey: "hypercasualLong", icon: IoSparklesOutline },
  { id: "stylized", labelKey: "stylized", icon: IoBrushOutline },
  { id: "realistic", labelKey: "realistic", icon: IoEyeOutline },
  { id: "custom", labelKey: "custom", icon: IoOptionsOutline },
]

export function AdvancedSettingsModal({
  open,
  onOpenChange,
  currentStyle,
  onStyleChange,
  extractionMethod,
  onExtractionMethodChange,
  colorCount,
  onColorCountChange,
  valueCheckEnabled,
  onValueCheckToggle,
  colorBlindMode,
  onColorBlindModeChange,
}: AdvancedSettingsModalProps) {
  const t = useTranslations("advancedSettings")
  const ts = useTranslations("styles")
  const tc = useTranslations("colorBlind")
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[72vh] overflow-y-auto px-6 py-5 space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{t("extractionMethod")}</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={extractionMethod === "histogram" ? "default" : "outline"}
                onClick={() => onExtractionMethodChange("histogram")}
              >
                <IoStatsChartOutline className="h-4 w-4 mr-2" />
                {t("hueHistogram")}
              </Button>
              <Button
                variant={extractionMethod === "kmeans" ? "default" : "outline"}
                onClick={() => onExtractionMethodChange("kmeans")}
              >
                <IoColorFilterOutline className="h-4 w-4 mr-2" />
                {t("kmeans")}
              </Button>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{t("colorCount")}</h3>
            <ColorCountSelector value={colorCount} onChange={onColorCountChange} />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{t("stylePreset")}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {styleButtons.map((style) => (
                <Button
                  key={style.id}
                  variant={currentStyle === style.id ? "default" : "outline"}
                  onClick={() => onStyleChange(style.id)}
                >
                  <style.icon className="h-4 w-4 mr-2" />
                  {ts(style.labelKey)}
                </Button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{t("valueCheck")}</h3>
            <Button
              variant={valueCheckEnabled ? "secondary" : "outline"}
              onClick={onValueCheckToggle}
            >
              {valueCheckEnabled ? t("enabled") : t("disabled")}
            </Button>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{t("colorVision")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COLOR_BLINDNESS_OPTIONS.map((option) => (
                <Button
                  key={option.type}
                  variant={colorBlindMode === option.type ? "default" : "outline"}
                  className="h-auto justify-start py-3"
                  onClick={() => onColorBlindModeChange(option.type)}
                >
                  <span className="text-left">
                    <span className="block font-medium">{tc(`${option.type}Label`)}</span>
                    <span className="block text-xs text-muted-foreground">{tc(`${option.type}Desc`)}</span>
                  </span>
                </Button>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
