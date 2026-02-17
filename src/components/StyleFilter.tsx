"use client"

import type { IconType } from "react-icons"
import {
  IoPawOutline,
  IoSparklesOutline,
  IoBrushOutline,
  IoEyeOutline,
  IoOptionsOutline,
} from "react-icons/io5"
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
}

interface StyleOption {
  id: StyleType
  label: string
  description: string
  icon: IconType
  accent: string
}

const styleOptions: StyleOption[] = [
  {
    id: "original",
    label: "Original",
    description: "Keep extracted colors",
    icon: IoPawOutline,
    accent: "#a0a0b0",
  },
  {
    id: "hypercasual",
    label: "Hyper",
    description: "Bright and punchy",
    icon: IoSparklesOutline,
    accent: "#fbbf24",
  },
  {
    id: "stylized",
    label: "Stylized",
    description: "Art-friendly shifts",
    icon: IoBrushOutline,
    accent: "#c084fc",
  },
  {
    id: "realistic",
    label: "Realistic",
    description: "Subtle and natural",
    icon: IoEyeOutline,
    accent: "#34d399",
  },
  {
    id: "custom",
    label: "Custom",
    description: "Manual controls",
    icon: IoOptionsOutline,
    accent: "#60a5fa",
  },
]

export function StyleFilter({
  currentStyle,
  onStyleChange,
  customSettings,
  onCustomSettingsChange,
  valueCheckEnabled,
  onValueCheckToggle,
}: StyleFilterProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium tracking-wide">Style Filter</h3>
        {onValueCheckToggle && (
          <Button
            variant={valueCheckEnabled ? "secondary" : "outline"}
            size="sm"
            onClick={onValueCheckToggle}
          >
            <IoEyeOutline className="h-4 w-4 mr-2" />
            Value Check
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {styleOptions.map((style) => {
          const isActive = currentStyle === style.id

          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onStyleChange(style.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition-all",
                "bg-[#1a1a24] border-[#24242e] hover:border-[#3a3a4a]",
                isActive && "ring-2 ring-offset-2 ring-offset-background"
              )}
              style={isActive ? { borderColor: style.accent, backgroundColor: `${style.accent}20` } : undefined}
            >
              <style.icon className="h-4 w-4 mb-2" style={{ color: isActive ? style.accent : "#a0a0b0" }} />
              <p className="text-xs font-semibold leading-tight">{style.label}</p>
              <p className="mt-1 text-[10px] text-muted-foreground leading-snug">{style.description}</p>
            </button>
          )
        })}
      </div>

      {currentStyle === "custom" && customSettings && onCustomSettingsChange && (
        <div className="space-y-4 p-4 rounded-xl border border-[#2d2d38] bg-[#16161e]">
          <SliderControl
            label="Saturation"
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
            label="Lightness"
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
            label="Hue Shift"
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
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  formatValue: (value: number) => string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-muted-foreground">{label}</label>
        <span className="text-sm font-mono">{formatValue(value)}</span>
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={onChange}
      />
    </div>
  )
}
