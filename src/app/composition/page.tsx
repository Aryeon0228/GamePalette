import type { Metadata } from "next"
import { getLocale } from "next-intl/server"
import { CompositionLabWorkspace } from "@/components/CompositionLabWorkspace"

export async function generateMetadata(): Promise<Metadata> {
  const ko = (await getLocale()) === "ko"
  const title = "Composition Lab | Studio Penumbra"
  const description = ko
    ? "물건의 크기·간격·방향·겹침을 바꾸며 구도를 실험하고, 이미지의 명암 덩어리와 여백을 비교하세요."
    : "Explore composition through size, spacing, direction and overlap, then compare value masses and negative space in your own images."
  return {
    title,
    description,
    keywords: ["composition", "negative space", "silhouette", "game art", "구도", "배치"],
    alternates: { canonical: "/composition" },
    openGraph: { title, description, type: "website", url: "/composition" },
  }
}

export default function CompositionPage() {
  return <CompositionLabWorkspace />
}
