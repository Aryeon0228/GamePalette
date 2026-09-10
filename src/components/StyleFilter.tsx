"use client"

import { useId } from "react"
import type { IconType } from "react-icons"
import {
  IoPawOutline,
  IoSparklesOutline,
  IoBrushOutline,
  IoEyeOutline,
  IoOptionsOutline,
} from "react-icons/io5"
import { useLocale, useTranslations } from "next-intl"
import { StyleType, CustomStyleSettings } from "@/types"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface StyleFilterProps {
  currentStyle: StyleType
  onStyleChange: (style: StyleType) => void
  customSettings?: CustomStyleSettings
  onCustomSettingsChange?: (settings: CustomStyleSettings) => void
  valueCheckEnabled?: boolean
  onValueCheckToggle?: () => void
  dense?: boolean
}

interface StyleOption {
  id: StyleType
  descKey: string
  icon: IconType
  accent: string
}

const styleOptions: StyleOption[] = [
  { id: "original", descKey: "originalDesc", icon: IoPawOutline, accent: "#a0a0b0" },
  { id: "hypercasual", descKey: "hypercasualDesc", icon: IoSparklesOutline, accent: "#fbbf24" },
  { id: "stylized", descKey: "stylizedDesc", icon: IoBrushOutline, accent: "#c084fc" },
  { id: "realistic", descKey: "realisticDesc", icon: IoEyeOutline, accent: "#34d399" },
  { id: "custom", descKey: "customDesc", icon: IoOptionsOutline, accent: "#60a5fa" },
]

export function StyleFilter({
  currentStyle,
  onStyleChange,
  customSettings,
  onCustomSettingsChange,
  valueCheckEnabled,
  onValueCheckToggle,
  dense = false,
}: StyleFilterProps) {
  const t = useTranslations("styleFilter")
  const ts = useTranslations("styles")
  const ko = useLocale() === "ko"
  const denseNames: Record<StyleType, string> = ko
    ? { original: "원본", hypercasual: "하이퍼", stylized: "스타일화", realistic: "리얼", custom: "커스텀" }
    : { original: "Original", hypercasual: "Hyper", stylized: "Stylized", realistic: "Realistic", custom: "Custom" }
  return (
    <div className={cn("min-w-0", dense ? "space-y-2" : "space-y-4")}>
      <div className={dense ? "flex flex-wrap items-center gap-x-2 gap-y-1" : "space-y-4"}>
      <div className={dense ? "contents" : "flex items-center justify-between"}>
        <h3 className={dense ? "text-[11px] font-medium text-muted-foreground" : "text-sm font-medium tracking-wide"}>{dense ? (ko ? "스타일" : "Style") : t("title")}</h3>
        {onValueCheckToggle && (
          <Button
            variant={valueCheckEnabled ? "secondary" : "outline"}
            size="sm"
            onClick={onValueCheckToggle}
            aria-pressed={valueCheckEnabled}
            className={dense ? "h-10 rounded-sm px-2 text-xs" : undefined}
          >
            <IoEyeOutline className="h-4 w-4 mr-2" />
            {t("valueCheck")}
          </Button>
        )}
      </div>

      <div className={dense ? "contents" : "grid grid-cols-2 sm:grid-cols-5 gap-2"}>
        {styleOptions.map((style) => {
          const isActive = currentStyle === style.id

          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onStyleChange(style.id)}
              className={cn(
                dense ? "min-h-10 rounded-sm border px-2.5 py-2 text-center transition-colors" : "rounded-xl border p-3 text-left transition-all",
                "bg-muted border-border hover:border-primary/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive && !dense && "ring-2 ring-offset-2 ring-offset-background"
              )}
              aria-pressed={isActive}
              aria-label={ts(style.id)}
              title={dense ? ts(style.descKey) : undefined}
              style={isActive ? { borderColor: "#bbb", backgroundColor: "#1a1a1a" } : undefined}
            >
              {!dense && <style.icon className="h-4 w-4 mb-2" style={{ color: isActive ? "#eee" : "#888" }} />}
              <span className={dense ? "block whitespace-nowrap text-[11px] font-medium leading-tight" : "block text-xs font-semibold leading-tight"}>{dense ? denseNames[style.id] : ts(style.id)}</span>
              {!dense && <p className="mt-1 text-[10px] text-muted-foreground leading-snug">{ts(style.descKey)}</p>}
            </button>
          )
        })}
      </div>
      </div>

      {currentStyle === "custom" && customSettings && onCustomSettingsChange && (
        <div className={dense ? "grid min-w-0 grid-cols-3 gap-3 border-t border-border pt-2" : "space-y-4 p-4 rounded-xl border border-border bg-card"}>
          <SliderControl
            dense={dense}
            label={t("saturation")}
            value={customSettings.saturationMultiplier}
            min={0}
            max={2}
            step={0.1}
            onChange={(value) =>
              onCustomSettingsChange({ ...customSettings, saturationMultiplier: value })
            }
            formatValue={(value) => `${Math.round(value * 100)}%`}
          />

          <SliderControl
            dense={dense}
            label={t("lightness")}
            value={customSettings.lightnessMultiplier}
            min={0}
            max={2}
            step={0.1}
            onChange={(value) =>
              onCustomSettingsChange({ ...customSettings, lightnessMultiplier: value })
            }
            formatValue={(value) => `${Math.round(value * 100)}%`}
          />

          <SliderControl
            dense={dense}
            label={t("hueShift")}
            value={customSettings.hueShift}
            min={-180}
            max={180}
            step={5}
            onChange={(value) =>
              onCustomSettingsChange({ ...customSettings, hueShift: value })
            }
            formatValue={(value) => `${value}°`}
          />
        </div>
      )}
    </div>
  )
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
  dense = false,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  formatValue: (value: number) => string
  dense?: boolean
}) {
  const inputId = useId()
  return (
    <div className={dense ? "min-w-0" : "space-y-2"}>
      <div className={cn("flex items-center justify-between", dense && "flex-wrap gap-x-1 gap-y-0.5")}>
        <label htmlFor={inputId} className={dense ? "text-[10px] text-muted-foreground" : "text-sm text-muted-foreground"}>{label}</label>
        <output htmlFor={inputId} className={dense ? "font-mono text-[10px]" : "text-sm font-mono"}>{formatValue(value)}</output>
      </div>
      <Slider
        id={inputId}
        className={dense ? "h-10 min-w-0 appearance-auto bg-transparent" : undefined}
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={onChange}
      />
    </div>
  )
}
