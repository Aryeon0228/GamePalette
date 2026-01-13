"use client"

import { useState, useMemo } from "react"
import { Copy, Check } from "lucide-react"
import { Color } from "@/types"
import { cn, copyToClipboard, calculateLuminance } from "@/lib/utils"

interface ColorCardProps {
  color: Color
  selected?: boolean
  onClick?: () => void
  showDetails?: boolean
}

export function ColorCard({ color, selected, onClick, showDetails = false }: ColorCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const handleCopy = async (value: string, field: string) => {
    await copyToClipboard(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Pre-compute formatted color strings
  const rgbString = useMemo(
    () => `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`,
    [color.rgb.r, color.rgb.g, color.rgb.b]
  )
  const hslString = useMemo(
    () => `hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`,
    [color.hsl.h, color.hsl.s, color.hsl.l]
  )

  // Determine text color based on luminance
  const luminance = calculateLuminance(color.rgb.r, color.rgb.g, color.rgb.b)
  const textColor = luminance > 128 ? 'text-black' : 'text-white'

  if (showDetails) {
    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <div
          className="h-32 flex items-center justify-center cursor-pointer"
          style={{ backgroundColor: color.hex }}
          onClick={onClick}
        >
          <span className={cn("text-lg font-mono font-bold", textColor)}>
            {color.hex}
          </span>
        </div>

        <div className="p-4 space-y-3 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm font-medium">{color.name || 'Custom'}</span>
          </div>

          <CopyRow
            label="HEX"
            value={color.hex}
            copied={copiedField === 'hex'}
            onCopy={() => handleCopy(color.hex, 'hex')}
          />

          <CopyRow
            label="RGB"
            value={rgbString}
            copied={copiedField === 'rgb'}
            onCopy={() => handleCopy(rgbString, 'rgb')}
          />

          <CopyRow
            label="HSL"
            value={hslString}
            copied={copiedField === 'hsl'}
            onCopy={() => handleCopy(hslString, 'hsl')}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "group relative rounded-lg overflow-hidden cursor-pointer transition-all",
        "aspect-square sm:aspect-[4/5]",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
      style={{ backgroundColor: color.hex }}
      onClick={onClick}
    >
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent",
          "opacity-0 group-hover:opacity-100 transition-opacity"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-white">{color.hex}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCopy(color.hex, 'quick')
            }}
            className="p-1 rounded hover:bg-white/20 transition-colors"
          >
            {copiedField === 'quick' ? (
              <Check className="h-3 w-3 text-green-400" />
            ) : (
              <Copy className="h-3 w-3 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function CopyRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <button
        onClick={onCopy}
        className="flex items-center space-x-2 text-sm font-mono hover:text-primary transition-colors"
      >
        <span>{value}</span>
        {copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </div>
  )
}
