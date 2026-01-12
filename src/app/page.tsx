"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Palette, Eye, Download, Sparkles, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ImageUploader } from "@/components/ImageUploader"
import { PalettePreview } from "@/components/PaletteDisplay"
import { usePaletteStore } from "@/stores/paletteStore"
import { extractColors } from "@/lib/colorExtractor"
import { generateId } from "@/lib/utils"

const features = [
  {
    icon: Palette,
    title: "Style Filters",
    description: "Transform palettes to Hyper-casual, Stylized, or Realistic game art styles",
  },
  {
    icon: Eye,
    title: "Value Check",
    description: "Preview colors in grayscale to ensure proper contrast and readability",
  },
  {
    icon: Download,
    title: "Engine Export",
    description: "Export to Unity ScriptableObject, Unreal DataTable, or web formats",
  },
  {
    icon: Sparkles,
    title: "Smart Extraction",
    description: "K-means clustering algorithm for accurate dominant color extraction",
  },
]

export default function HomePage() {
  const router = useRouter()
  const { savedPalettes, setCurrentPalette, setOriginalColors, setSourceImageUrl, colorCount, extractionMethod, setExtractionMethod } = usePaletteStore()
  const [isExtracting, setIsExtracting] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Wait for Zustand hydration to complete
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
    <div className="container py-12 space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
          <span className="gradient-text">Color Palette Tool</span>
          <br />
          for Game Artists
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Extract colors from reference images, transform them to match your game&apos;s style,
          and export directly to Unity or Unreal Engine.
        </p>
      </section>

      {/* Upload Section */}
      <section className="max-w-2xl mx-auto">
        <div className="rounded-xl border border-border bg-card p-6">
          <ImageUploader
            onImageLoad={handleImageLoad}
          />

          {/* Extraction Method Selection */}
          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">Extraction Method:</span>
              <div className="relative group">
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-lg bg-popover border border-border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <p className="text-xs text-popover-foreground mb-2">
                    <strong>Hue Histogram:</strong> Analyzes color distribution by hue values. Better for images with distinct color regions and produces more vibrant results.
                  </p>
                  <p className="text-xs text-popover-foreground">
                    <strong>K-Means:</strong> Groups similar pixels using clustering algorithm. Better for photos with subtle color variations and gradients.
                  </p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-border"></div>
                </div>
              </div>
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setExtractionMethod('histogram')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  isHydrated && extractionMethod === 'histogram'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted text-muted-foreground'
                }`}
              >
                Hue Histogram
              </button>
              <button
                onClick={() => setExtractionMethod('kmeans')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  isHydrated && extractionMethod === 'kmeans'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted text-muted-foreground'
                }`}
              >
                K-Means
              </button>
            </div>
          </div>
          {isExtracting && (
            <div className="mt-4 text-center text-muted-foreground">
              <div className="inline-block animate-spin mr-2">
                <Palette className="h-5 w-5" />
              </div>
              Extracting colors...
            </div>
          )}
        </div>
      </section>

      {/* Recent Palettes */}
      {recentPalettes.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Palettes</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/library">
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPalettes.map((palette) => (
              <Link
                key={palette.id}
                href={`/palette/${palette.id}`}
                className="block rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors"
              >
                <PalettePreview colors={palette.colors} className="mb-3" />
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{palette.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {palette.colors.length} colors
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="space-y-8">
        <h2 className="text-2xl font-semibold text-center">
          Built for Game Development Workflow
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-border bg-card p-6 space-y-4"
            >
              <div className="inline-flex p-3 rounded-lg bg-primary/10">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center space-y-6 py-12">
        <h2 className="text-3xl font-bold">Ready to create stunning game palettes?</h2>
        <div className="flex items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/create">
              Start Creating
              <ArrowRight className="h-4 w-4 ml-2" />
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
