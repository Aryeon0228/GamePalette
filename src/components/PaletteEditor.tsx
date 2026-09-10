"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useLocale } from "next-intl"
import { ArrowLeft, ArrowRight, Check, Copy, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn, copyToClipboard, getColorName, hexToRgb, rgbToHsl } from "@/lib/utils"
import { Color } from "@/types"

interface PaletteEditorProps {
  colors: Color[]
  selectedIndex: number
  onSelect: (index: number) => void
  /** Receives the exact edited colors, plus the selection after the edit. */
  onChange: (colors: Color[], selectedIndex: number) => void
  fallbackHex?: string
  compact?: boolean
}

function colorFromHex(value: string): Color | null {
  const digits = value.trim().replace(/^#/, "")
  if (!/^(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(digits)) return null
  const hex = `#${digits.length === 3 ? [...digits].map((digit) => digit.repeat(2)).join("") : digits}`.toUpperCase()
  const rgb = hexToRgb(hex)
  return { hex, rgb, hsl: rgbToHsl(rgb.r, rgb.g, rgb.b), name: getColorName(hex) }
}

export function PaletteEditor({ colors, selectedIndex, onSelect, onChange, fallbackHex = "#756CF0", compact = false }: PaletteEditorProps) {
  const ko = useLocale() === "ko"
  const inputId = useId()
  const activeIndex = Math.max(0, Math.min(selectedIndex, colors.length - 1))
  const selectedColor = colors[activeIndex]
  const [hexInput, setHexInput] = useState(selectedColor?.hex ?? "")
  const [invalid, setInvalid] = useState(false)
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle")
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const swatchRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    setHexInput(selectedColor?.hex.toUpperCase() ?? "")
    setInvalid(false)
    setCopyStatus("idle")
  }, [activeIndex, selectedColor?.hex])

  useEffect(() => () => {
    if (copyTimeout.current) clearTimeout(copyTimeout.current)
  }, [])

  const replaceSelected = (color: Color) => {
    if (!selectedColor) return
    onChange(colors.map((existing, index) => index === activeIndex ? color : existing), activeIndex)
  }

  const commitHex = () => {
    const color = colorFromHex(hexInput)
    setInvalid(!color)
    if (color) {
      setHexInput(color.hex)
      if (color.hex !== selectedColor?.hex.toUpperCase()) replaceSelected(color)
    }
  }

  const moveSelected = (direction: -1 | 1) => {
    const target = activeIndex + direction
    if (!selectedColor || target < 0 || target >= colors.length) return
    const next = [...colors]
    ;[next[activeIndex], next[target]] = [next[target], next[activeIndex]]
    onChange(next, target)
  }

  const addColor = () => {
    if (colors.length >= 32) return
    const color = colorFromHex(fallbackHex) ?? selectedColor ?? colorFromHex("#756CF0")!
    onChange([...colors, color], colors.length)
  }

  const deleteSelected = () => {
    if (colors.length <= 1) return
    const next = colors.filter((_, index) => index !== activeIndex)
    onChange(next, Math.min(activeIndex, next.length - 1))
  }

  const copySelected = async () => {
    if (!selectedColor) return
    if (copyTimeout.current) clearTimeout(copyTimeout.current)
    try {
      await copyToClipboard(selectedColor.hex.toUpperCase())
      setCopyStatus("copied")
    } catch {
      setCopyStatus("error")
    }
    copyTimeout.current = setTimeout(() => setCopyStatus("idle"), 2000)
  }

  return (
    <section className="space-y-4" aria-label={ko ? "팔레트 편집" : "Palette editor"}>
      {!compact && <>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{ko ? "팔레트 편집" : "Edit palette"}</h2>
        <span className="font-mono text-xs text-muted-foreground">{colors.length} {ko ? "색" : "colors"}</span>
      </div>

      <div className="flex flex-wrap gap-1.5" aria-label={ko ? "색상 선택" : "Select a color"}>
        {colors.map((color, index) => (
          <button
            key={index}
            ref={(element) => { swatchRefs.current[index] = element }}
            type="button"
            aria-label={ko ? `${index + 1}번 색상 ${color.hex} 선택` : `Select color ${index + 1}, ${color.hex}`}
            aria-pressed={index === activeIndex}
            title={`${index + 1} · ${color.hex.toUpperCase()}`}
            onClick={() => onSelect(index)}
            onKeyDown={(event) => {
              let target = index
              if (event.key === "ArrowLeft") target = Math.max(0, index - 1)
              else if (event.key === "ArrowRight") target = Math.min(colors.length - 1, index + 1)
              else if (event.key === "Home") target = 0
              else if (event.key === "End") target = colors.length - 1
              else return
              event.preventDefault()
              onSelect(target)
              swatchRefs.current[target]?.focus()
            }}
            className={cn(
              "h-9 w-9 rounded-sm border border-border transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              index === activeIndex && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
            )}
            style={{ backgroundColor: color.hex }}
          />
        ))}
        <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-sm" onClick={addColor} disabled={colors.length >= 32} aria-label={ko ? "색상 추가" : "Add color"} title={colors.length >= 32 ? (ko ? "최대 32개의 색상을 사용할 수 있습니다." : "A palette can contain up to 32 colors.") : (ko ? "색상 추가" : "Add color")}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      </>}

      {selectedColor ? (
        <>
          <div className={cn("space-y-2", !compact && "border-t border-border pt-4")}>
            <p className="text-xs text-muted-foreground">{ko ? `선택한 색상 · ${activeIndex + 1} / ${colors.length}` : `Selected color · ${activeIndex + 1} / ${colors.length}`}</p>
            <label htmlFor={inputId} className="block text-xs font-medium">HEX</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedColor.hex}
                aria-label={ko ? `${activeIndex + 1}번 색상 변경` : `Change color ${activeIndex + 1}`}
                onChange={(event) => {
                  const color = colorFromHex(event.target.value)
                  if (color) replaceSelected(color)
                }}
                className="h-10 w-10 shrink-0 cursor-pointer rounded-sm border border-border bg-transparent p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Input
                id={inputId}
                value={hexInput}
                spellCheck={false}
                autoComplete="off"
                maxLength={7}
                aria-invalid={invalid}
                aria-describedby={`${inputId}-hint`}
                className={cn("min-w-0 rounded-sm font-mono uppercase", invalid && "border-destructive")}
                onChange={(event) => {
                  const value = event.target.value
                  setHexInput(value)
                  setInvalid(false)
                  if (/^#?[a-f\d]{6}$/i.test(value.trim())) {
                    const color = colorFromHex(value)
                    if (color) replaceSelected(color)
                  }
                }}
                onBlur={commitHex}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    commitHex()
                  } else if (event.key === "Escape") {
                    setHexInput(selectedColor.hex.toUpperCase())
                    setInvalid(false)
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" className="shrink-0 rounded-sm" onClick={copySelected} aria-label={ko ? "HEX 복사" : "Copy HEX"} title={ko ? "HEX 복사" : "Copy HEX"}>
                {copyStatus === "copied" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              </Button>
            </div>
            <p id={`${inputId}-hint`} className={cn("text-xs", invalid ? "text-destructive" : "text-muted-foreground")}>
              {invalid
                ? (ko ? "3자리 또는 6자리 HEX 색상을 입력하세요." : "Enter a 3- or 6-digit HEX color.")
                : (ko ? "HEX 입력 또는 색상 선택기로 변경하세요." : "Edit the HEX value or use the color picker.")}
            </p>
            <span role="status" className={copyStatus === "idle" ? "sr-only" : "block text-xs text-muted-foreground"}>{copyStatus === "copied" ? (ko ? "HEX를 복사했습니다." : "HEX copied.") : copyStatus === "error" ? (ko ? "복사할 수 없습니다. HEX 값을 선택해 복사하세요." : "Copy failed. Select the HEX value to copy it.") : ""}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-sm text-xs" disabled={activeIndex === 0} onClick={() => moveSelected(-1)}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />{ko ? "앞으로 이동" : "Move earlier"}
            </Button>
            <Button type="button" variant="outline" size="sm" className="rounded-sm text-xs" disabled={activeIndex === colors.length - 1} onClick={() => moveSelected(1)}>
              {ko ? "뒤로 이동" : "Move later"}<ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button type="button" variant="outline" size="sm" className="rounded-sm text-xs" onClick={addColor} disabled={colors.length >= 32} title={colors.length >= 32 ? (ko ? "최대 32개의 색상을 사용할 수 있습니다." : "A palette can contain up to 32 colors.") : undefined}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />{ko ? "색상 추가" : "Add color"}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="rounded-sm text-xs text-muted-foreground hover:text-destructive" disabled={colors.length <= 1} onClick={deleteSelected} title={colors.length <= 1 ? (ko ? "최소 1개의 색상이 필요합니다." : "Keep at least one color.") : undefined}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />{ko ? "색상 삭제" : "Delete color"}
            </Button>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">{ko ? "색상을 추가해 편집을 시작하세요." : "Add a color to start editing."}</p>
      )}
    </section>
  )
}
