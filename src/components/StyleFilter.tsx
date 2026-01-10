"use client"

import { StyleType, CustomStyleSettings } from "@/types"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { Sparkles, Palette, Eye, SlidersHorizontal } from "lucide-react"

interface StyleFilterProps {
  currentStyle: StyleType
  onStyleChange: (style: StyleType) => void
  customSettings?: CustomStyleSettings
  onCustomSettingsChange?: (settings: CustomStyleSettings) => void
  valueCheckEnabled?: boolean
  onValueCheckToggle?: () => void
}

const styles: { id: StyleType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: "original",
    label: "Original",
    icon: <Palette className="h-4 w-4" />,
    description: "Keep extracted colors as-is",
  },
  {
    id: "hypercasual",
    label: "Hyper-casual",
    icon: <Sparkles className="h-4 w-4" />,
    description: "Bright, saturated colors",
  },
  {
    id: "stylized",
    label: "Stylized",
    icon: <Palette className="h-4 w-4" />,
    description: "Warm, harmonious tones",
  },
  {
    id: "realistic",
    label: "Realistic",
    icon: <Eye className="h-4 w-4" />,
    description: "Natural, muted colors",
  },
  {
    id: "custom",
    label: "Custom",
    icon: <SlidersHorizontal className="h-4 w-4" />,
    description: "Adjust manually",
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
        <h3 className="text-sm font-medium">Style Filter</h3>
        {onValueCheckToggle && (
          <Button
            variant={valueCheckEnabled ? "secondary" : "outline"}
            size="sm"
            onClick={onValueCheckToggle}
          >
            <Eye className="h-4 w-4 mr-2" />
            Value Check
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {styles.map((style) => (
          <Button
            key={style.id}
            variant={currentStyle === style.id ? "default" : "outline"}
            size="sm"
            onClick={() => onStyleChange(style.id)}
            className={cn(
              "flex items-center space-x-2",
              currentStyle === style.id && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
          >
            {style.icon}
            <span>{style.label}</span>
          </Button>
        ))}
      </div>

      {currentStyle === "custom" && customSettings && onCustomSettingsChange && (
        <div className="space-y-4 p-4 rounded-lg border border-border bg-card">
          <SliderControl
            label="Saturation"
            value={customSettings.saturationMultiplier}
            min={0}
            max={2}
            step={0.1}
            onChange={(value) =>
              onCustomSettingsChange({ ...customSettings, saturationMultiplier: value })
            }
            formatValue={(v) => `${Math.round(v * 100)}%`}
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
            formatValue={(v) => `${Math.round(v * 100)}%`}
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
            formatValue={(v) => `${v}°`}
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
