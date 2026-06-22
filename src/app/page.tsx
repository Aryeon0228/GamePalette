"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { IoImagesOutline, IoFolderOpenOutline, IoArrowForwardOutline } from "react-icons/io5"
import { ColorAnalyzer } from "@/components/ColorAnalyzer"

export default function HomePage() {
  const t = useTranslations("analyzer")

  return (
    <div className="space-y-4">
      <ColorAnalyzer />

      <div className="container pb-10">
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">{t("moreTitle")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("moreSub")}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/create"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary transition-colors"
            >
              <IoImagesOutline className="h-4 w-4" />
              {t("toExtract")}
              <IoArrowForwardOutline className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/library"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary transition-colors"
            >
              <IoFolderOpenOutline className="h-4 w-4" />
              {t("toLibrary")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
