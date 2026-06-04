"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import type { IconType } from "react-icons"
import {
  IoArrowForwardOutline,
  IoColorPaletteOutline,
  IoEyeOutline,
  IoDownloadOutline,
  IoSparklesOutline,
  IoInformationCircleOutline,
  IoStatsChartOutline,
  IoColorFilterOutline,
} from "react-icons/io5"
import { Button } from "@/components/ui/button"
import { ImageUploader } from "@/components/ImageUploader"
import { PalettePreview } from "@/components/PaletteDisplay"
import { usePaletteStore } from "@/stores/paletteStore"
import { extractColors } from "@/lib/colorExtractor"
import { generateId } from "@/lib/utils"

interface FeatureItem {
  id: string
  icon: IconType
  accent: string
}

const features: FeatureItem[] = [
  {
    id: "feature1",
    icon: IoColorPaletteOutline,
    accent: "#5db8e8",
  },
  {
    id: "feature2",
    icon: IoEyeOutline,
    accent: "#34d399",
  },
  {
    id: "feature3",
    icon: IoDownloadOutline,
    accent: "#60a5fa",
  },
  {
    id: "feature4",
    icon: IoSparklesOutline,
    accent: "#fbbf24",
  },
]

export default function HomePage() {
  const t = useTranslations("home")
  const router = useRouter()
  const {
    savedPalettes,
    setCurrentPalette,
    setOriginalColors,
    setSourceImageUrl,
    colorCount,
    extractionMethod,
    setExtractionMethod,
  } = usePaletteStore()

  const [isExtracting, setIsExtracting] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const recentPalettes = savedPalettes.slice(-3).reverse()

  const handleImageLoad = async (imageUrl: string) => {
    setIsExtracting(true)
    setSourceImageUrl(imageUrl)

    try {
      const colors = await extractColors(imageUrl, colorCount, extractionMethod)

      setOriginalColors(colors)
      setCurrentPalette({
        id: generateId(),
        name: "Untitled Palette",
        colors,
        sourceImageUrl: imageUrl,
        style: "original",
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      router.push("/create")
    } catch (error) {
      console.error("Failed to extract colors:", error)
    } finally {
      setIsExtracting(false)
    }
  }

  return (
    <div className="container py-10 space-y-14">
      <section className="text-center space-y-5">
        <div className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          {t("badge")}
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.025em]">
          <span className="gradient-text">{t("heroTitle1")}</span>
          <br />
          {t("heroTitle2")}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("heroSubtitle")}
        </p>
      </section>

      <section className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-border bg-card/95 p-6 shadow-[0_16px_44px_rgba(0,0,0,0.35)]">
          <ImageUploader onImageLoad={handleImageLoad} />

          <div className="mt-5 rounded-xl border border-border bg-muted px-4 py-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span>{t("extractionMethod")}</span>
                <div className="relative group">
                  <IoInformationCircleOutline className="w-4 h-4 cursor-help text-muted-foreground" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 rounded-lg bg-background border border-border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left">
                    <p className="text-xs text-muted-foreground mb-2">
                      {t.rich("tooltipHistogram", { b: (chunks) => <strong className="text-foreground">{chunks}</strong> })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.rich("tooltipKmeans", { b: (chunks) => <strong className="text-foreground">{chunks}</strong> })}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => setExtractionMethod("histogram")}
                  className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isHydrated && extractionMethod === "histogram"
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent hover:bg-accent text-muted-foreground"
                  }`}
                >
                  <IoStatsChartOutline className="h-4 w-4" />
                  {t("hueHistogram")}
                </button>
                <button
                  onClick={() => setExtractionMethod("kmeans")}
                  className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isHydrated && extractionMethod === "kmeans"
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent hover:bg-accent text-muted-foreground"
                  }`}
                >
                  <IoColorFilterOutline className="h-4 w-4" />
                  {t("kmeans")}
                </button>
              </div>
            </div>
          </div>

          {isExtracting && (
            <div className="mt-4 text-center text-muted-foreground">
              <div className="inline-block animate-spin mr-2">
                <IoColorPaletteOutline className="h-5 w-5" />
              </div>
              {t("extracting")}
            </div>
          )}
        </div>
      </section>

      {recentPalettes.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t("recentPalettes")}</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/library">
                {t("viewAll")}
                <IoArrowForwardOutline className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPalettes.map((palette) => (
              <Link
                key={palette.id}
                href={`/palette/${palette.id}`}
                className="block rounded-xl border border-border bg-card p-4 hover:border-primary transition-colors"
              >
                <PalettePreview colors={palette.colors} className="mb-3 h-10 rounded-lg" />
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium truncate">{palette.name}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {t("colorsCount", { count: palette.colors.length })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-8">
        <h2 className="text-2xl font-semibold text-center tracking-tight">
          {t("featuresTitle")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="rounded-xl border border-border bg-card p-5 space-y-3"
            >
              <div
                className="inline-flex p-2.5 rounded-lg"
                style={{ backgroundColor: `${feature.accent}20` }}
              >
                <feature.icon className="h-5 w-5" style={{ color: feature.accent }} />
              </div>
              <h3 className="font-semibold">{t(`${feature.id}Title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`${feature.id}Desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="text-center space-y-5 py-8">
        <h2 className="text-3xl font-bold tracking-tight">{t("ctaTitle")}</h2>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
            <Link href="/create">
              {t("startCreating")}
              <IoArrowForwardOutline className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/pricing">{t("viewPricing")}</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
