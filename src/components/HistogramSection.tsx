"use client"

import { useTranslations } from "next-intl"
import { IoAnalyticsOutline } from "react-icons/io5"
import type { LuminosityHistogram } from "@/lib/colorExtractor"

interface HistogramSectionProps {
  histogram: LuminosityHistogram
}

interface ToneStat {
  key: string
  value: number
  accent?: boolean
}

export function HistogramSection({ histogram }: HistogramSectionProps) {
  const t = useTranslations("histogram")

  const stats: ToneStat[] = [
    { key: "dark", value: histogram.darkPercent },
    { key: "mid", value: histogram.midPercent },
    { key: "bright", value: histogram.brightPercent },
    { key: "avg", value: histogram.average, accent: true },
  ]

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <IoAnalyticsOutline className="h-4 w-4" />
          <span>{t("luminosity")}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-primary tabular-nums">
            {histogram.contrast}%
          </span>
          <span className="text-xs text-muted-foreground">{t("contrast")}</span>
        </div>
      </div>

      {/* 32-bin brightness bars */}
      <div className="flex items-end gap-px h-24">
        {histogram.bins.map((value, index) => (
          <div
            key={`bin-${index}`}
            className="flex-1 rounded-sm"
            style={{
              height: `${Math.max(value, 2)}%`,
              // dark bins → muted, mid → subtle, bright → faint
              backgroundColor:
                index < 11
                  ? "hsl(var(--muted-foreground))"
                  : index < 21
                    ? "hsl(var(--muted-foreground) / 0.6)"
                    : "hsl(var(--muted-foreground) / 0.35)",
            }}
          />
        ))}
      </div>

      {/* Grayscale reference gradient */}
      <div className="flex h-1.5 overflow-hidden rounded-full">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={`grad-${i}`}
            className="flex-1"
            style={{ backgroundColor: `rgb(${i * 17}, ${i * 17}, ${i * 17})` }}
          />
        ))}
      </div>

      {/* Tone distribution */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.key}
            className={
              stat.accent
                ? "rounded-lg border border-primary/40 bg-primary/10 px-2 py-2 text-center"
                : "rounded-lg border border-border bg-background px-2 py-2 text-center"
            }
          >
            <p
              className={
                stat.accent
                  ? "text-sm font-semibold text-primary tabular-nums"
                  : "text-sm font-semibold tabular-nums"
              }
            >
              {stat.value}
              {stat.accent ? "" : "%"}
            </p>
            <p className="text-[10px] text-muted-foreground">{t(stat.key)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
