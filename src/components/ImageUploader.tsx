"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useTranslations } from "next-intl"
import { IoCloudUploadOutline, IoLinkOutline, IoImageOutline, IoCloseOutline } from "react-icons/io5"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ImageUploaderProps {
  onImageLoad: (imageUrl: string) => void
  currentImage?: string | null
  onClear?: () => void
}

export function ImageUploader({ onImageLoad, currentImage, onClear }: ImageUploaderProps) {
  const t = useTranslations("imageUploader")
  const [isDragging, setIsDragging] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlValue, setUrlValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(t("errInvalidImage"))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        onImageLoad(result)
        setIsLoading(false)
      }
      reader.onerror = () => {
        setError(t("errReadFail"))
        setIsLoading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setError(t("errProcessFail"))
      setIsLoading(false)
    }
  }, [onImageLoad, t])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleUrlSubmit = useCallback(() => {
    if (!urlValue) return

    setIsLoading(true)
    setError(null)

    // Validate URL
    try {
      new URL(urlValue)
    } catch {
      setError(t("errInvalidUrl"))
      setIsLoading(false)
      return
    }

    // Test if image loads
    const img = new window.Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      onImageLoad(urlValue)
      setIsLoading(false)
      setShowUrlInput(false)
      setUrlValue("")
    }
    img.onerror = () => {
      setError(t("errLoadUrlFail"))
      setIsLoading(false)
    }
    img.src = urlValue
  }, [urlValue, onImageLoad, t])

  // Handle paste event
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            handleFile(file)
            break
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [handleFile])

  if (currentImage) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-border">
        <Image
          src={currentImage}
          alt="Uploaded"
          width={800}
          height={320}
          className="w-full h-auto max-h-80 object-contain bg-black/20"
          unoptimized
        />
        {onClear && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={onClear}
          >
            <IoCloseOutline className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          isLoading && "opacity-50 pointer-events-none"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />

        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 rounded-full bg-muted">
            <IoCloudUploadOutline className="h-8 w-8 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isLoading ? t("loading") : t("dropText")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("pasteHint")}
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <IoImageOutline className="h-4 w-4" />
            <span>{t("fileTypes")}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <div className="flex-1 border-t border-border" />
        <span className="px-4 text-sm text-muted-foreground">{t("or")}</span>
        <div className="flex-1 border-t border-border" />
      </div>

      {showUrlInput ? (
        <div className="flex space-x-2">
          <Input
            type="url"
            placeholder={t("urlPlaceholder")}
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
          />
          <Button onClick={handleUrlSubmit} disabled={isLoading}>
            {t("load")}
          </Button>
          <Button variant="ghost" onClick={() => setShowUrlInput(false)}>
            {t("cancel")}
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowUrlInput(true)}
        >
          <IoLinkOutline className="h-4 w-4 mr-2" />
          {t("loadFromUrl")}
        </Button>
      )}

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  )
}
