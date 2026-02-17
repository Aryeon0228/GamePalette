"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  icon: IconType
  title: string
  description: string
  accent: string
}

const features: FeatureItem[] = [
  {
    icon: IoColorPaletteOutline,
    title: "Style Presets",
    description: "Switch palettes across hyper, stylized, and realistic game-art tones.",
    accent: "#4f7bb8",
  },
  {
    icon: IoEyeOutline,
    title: "Value Check",
    description: "Validate contrast and readability using grayscale previews.",
    accent: "#34d399",
  },
  {
    icon: IoDownloadOutline,
    title: "Flexible Export",
    description: "Export moodboards, SNS cards, and engine-ready formats quickly.",
    accent: "#60a5fa",
  },
  {
    icon: IoSparklesOutline,
    title: "Smart Extraction",
    description: "Use Histogram or K-Means extraction based on your reference art.",
    accent: "#fbbf24",
  },
]

export default function HomePage() {
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
        <div className="inline-flex items-center rounded-full border border-[#2d2d38] bg-[#16161e] px-3 py-1 text-xs text-muted-foreground">
          Pixel Paw Web Studio
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.025em]">
          <span className="gradient-text">Extract. Refine. Export.</span>
          <br />
          Color Workflow for Game Art
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Bring reference art into a production-ready palette pipeline with style presets,
          value checks, and export presets tuned for game workflows.
        </p>
      </section>

      <section className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-[#2d2d38] bg-[#16161e]/95 p-6 shadow-[0_16px_44px_rgba(0,0,0,0.35)]">
          <ImageUploader onImageLoad={handleImageLoad} />

          <div className="mt-5 rounded-xl border border-[#2d2d38] bg-[#1a1a24] px-4 py-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span>Extraction Method</span>
                <div className="relative group">
                  <IoInformationCircleOutline className="w-4 h-4 cursor-help text-[#a0a0b0]" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 rounded-lg bg-[#101018] border border-[#2d2d38] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left">
                    <p className="text-xs text-muted-foreground mb-2">
                      <strong className="text-foreground">Hue Histogram:</strong> Strong for stylized art with distinct color regions.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">K-Means:</strong> Better for photo references and subtle gradients.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex rounded-xl border border-[#2d2d38] overflow-hidden">
                <button
                  onClick={() => setExtractionMethod("histogram")}
                  className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isHydrated && extractionMethod === "histogram"
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent hover:bg-[#24242e] text-muted-foreground"
                  }`}
                >
                  <IoStatsChartOutline className="h-4 w-4" />
                  Hue Histogram
                </button>
                <button
                  onClick={() => setExtractionMethod("kmeans")}
                  className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isHydrated && extractionMethod === "kmeans"
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent hover:bg-[#24242e] text-muted-foreground"
                  }`}
                >
                  <IoColorFilterOutline className="h-4 w-4" />
                  K-Means
                </button>
              </div>
            </div>
          </div>

          {isExtracting && (
            <div className="mt-4 text-center text-muted-foreground">
              <div className="inline-block animate-spin mr-2">
                <IoColorPaletteOutline className="h-5 w-5" />
              </div>
              Extracting colors...
            </div>
          )}
        </div>
      </section>

      {recentPalettes.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Palettes</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/library">
                View all
                <IoArrowForwardOutline className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPalettes.map((palette) => (
              <Link
                key={palette.id}
                href={`/palette/${palette.id}`}
                className="block rounded-xl border border-[#2d2d38] bg-[#16161e] p-4 hover:border-[#4f7bb8] transition-colors"
              >
                <PalettePreview colors={palette.colors} className="mb-3 h-10 rounded-lg" />
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium truncate">{palette.name}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {palette.colors.length} colors
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-8">
        <h2 className="text-2xl font-semibold text-center tracking-tight">
          Built for Game Production Flow
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-[#2d2d38] bg-[#16161e] p-5 space-y-3"
            >
              <div
                className="inline-flex p-2.5 rounded-lg"
                style={{ backgroundColor: `${feature.accent}20` }}
              >
                <feature.icon className="h-5 w-5" style={{ color: feature.accent }} />
              </div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="text-center space-y-5 py-8">
        <h2 className="text-3xl font-bold tracking-tight">Ready to open your next palette?</h2>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
            <Link href="/create">
              Start Creating
              <IoArrowForwardOutline className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/pricing">View Pricing</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
