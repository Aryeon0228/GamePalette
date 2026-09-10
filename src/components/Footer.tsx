import { getLocale } from "next-intl/server"
import { LocaleSwitcher } from "@/components/LocaleSwitcher"

const MOBILE_APP_URL =
  process.env.NEXT_PUBLIC_MOBILE_APP_URL || "https://apps.apple.com/kr/app/pixel-pow/id6758751368"

export async function Footer() {
  const isKorean = (await getLocale()) === "ko"

  return (
    <footer className="portfolio-footer">
      <div className="footer-identity">
        <p>© {new Date().getFullYear()} Studio Penumbra · 김소연</p>
        <p>Color Lab <span aria-hidden="true">·</span> Pixel Paw</p>
      </div>
      <div className="footer-links">
        <LocaleSwitcher />
        <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer">Pixel Paw for iOS ↗</a>
        <a href="mailto:cloudysnowyday@gmail.com">{isKorean ? "문의" : "Contact"}</a>
        <a href="https://studio-penumbra.com/#work">Back to Work ↗</a>
      </div>
    </footer>
  )
}
