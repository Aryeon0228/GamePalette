"use client"

import { useState } from "react"
import { Download, Copy, Check, Lock } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Palette, ExportFormat } from "@/types"
import {
  exportPalette,
  exportToJson,
  exportToCss,
  exportToScss,
  exportToUnity,
  exportToUnreal,
} from "@/lib/exporters"
import { copyToClipboard } from "@/lib/utils"

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  palette: Palette
  isPro?: boolean
}

interface ExportOption {
  format: ExportFormat
  label: string
  description: string
  action: 'download' | 'copy'
  proOnly?: boolean
}

const exportOptions: ExportOption[] = [
  {
    format: 'png',
    label: 'PNG Image',
    description: 'Color swatches with HEX values',
    action: 'download',
  },
  {
    format: 'json',
    label: 'JSON',
    description: 'Structured data format',
    action: 'download',
  },
  {
    format: 'css',
    label: 'CSS Variables',
    description: 'Ready for web projects',
    action: 'copy',
  },
  {
    format: 'scss',
    label: 'SCSS Variables',
    description: 'With color map included',
    action: 'copy',
  },
  {
    format: 'unity',
    label: 'Unity ScriptableObject',
    description: 'C# code for Unity',
    action: 'download',
    proOnly: true,
  },
  {
    format: 'unreal',
    label: 'Unreal DataTable CSV',
    description: 'Import as DataTable',
    action: 'download',
    proOnly: true,
  },
]

export function ExportModal({ open, onOpenChange, palette, isPro = false }: ExportModalProps) {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState<string | null>(null)

  const handleExport = async (option: ExportOption) => {
    if (option.proOnly && !isPro) {
      // Show upgrade prompt
      return
    }

    setIsExporting(option.format)

    try {
      if (option.action === 'download') {
        await exportPalette(palette, option.format)
      } else {
        let content = ''
        switch (option.format) {
          case 'css':
            content = exportToCss(palette)
            break
          case 'scss':
            content = exportToScss(palette)
            break
          case 'json':
            content = exportToJson(palette)
            break
          case 'unity':
            content = exportToUnity(palette)
            break
          case 'unreal':
            content = exportToUnreal(palette)
            break
        }
        await copyToClipboard(content)
        setCopiedFormat(option.format)
        setTimeout(() => setCopiedFormat(null), 2000)
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Palette</DialogTitle>
          <DialogDescription>
            Choose a format to export &ldquo;{palette.name}&rdquo;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {exportOptions.map((option) => {
            const isLocked = option.proOnly && !isPro
            const isCopied = copiedFormat === option.format
            const isLoading = isExporting === option.format

            return (
              <div
                key={option.format}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isLocked
                    ? 'border-border bg-muted/50 opacity-75'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                } transition-colors`}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{option.label}</span>
                    {isLocked && (
                      <span className="text-xs bg-gradient-to-r from-indigo-500 to-pink-500 text-white px-2 py-0.5 rounded-full">
                        Pro
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>

                <Button
                  variant={isLocked ? "outline" : "secondary"}
                  size="sm"
                  onClick={() => handleExport(option)}
                  disabled={isLoading}
                >
                  {isLocked ? (
                    <Lock className="h-4 w-4" />
                  ) : isCopied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : option.action === 'download' ? (
                    <>
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>

        {!isPro && (
          <div className="border-t border-border pt-4">
            <Button className="w-full bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600">
              Upgrade to Pro - $3.99/month
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Unlock Unity/Unreal export, cloud sync, and more
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
