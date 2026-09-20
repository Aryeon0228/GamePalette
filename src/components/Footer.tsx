"use client"

import { useLocale } from "next-intl"
import { usePathname } from "next/navigation"
import { LocaleSwitcher } from "@/components/LocaleSwitcher"

const MOBILE_APP_URL =
  process.env.NEXT_PUBLIC_MOBILE_APP_URL || "https://apps.apple.com/kr/app/pixel-pow/id6758751368"

export function Footer() {
  const isKorean = useLocale() === "ko"
  const pathname = usePathname()
  const isComposition = pathname === "/composition" || pathname.startsWith("/composition/")

  return (
    <footer className="portfolio-footer">
      <div className="footer-identity">
        <p>© {new Date().getFullYear()} Studio Penumbra · 김소연</p>
        <p>{isComposition ? "Composition Lab" : <>Color Lab <span aria-hidden="true">·</span> Pixel Paw</>}</p>
      </div>
      <div className="footer-links">
        <LocaleSwitcher />
        {!isComposition && <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer">Pixel Paw for iOS ↗</a>}
        <a href="mailto:cloudysnowyday@gmail.com">{isKorean ? "문의" : "Contact"}</a>
        <a href="https://studio-penumbra.com/#lab">Back to Lab ↗</a>
      </div>
    </footer>
  )
}
