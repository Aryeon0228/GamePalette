import type { Metadata } from "next"
import Script from "next/script"
import localFont from "next/font/local"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"
import "./globals.css"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { MobileAppBanner } from "@/components/MobileAppBanner"
import { ToastProvider } from "@/components/ui/toast"
import { AuthProvider } from "@/contexts/AuthContext"

const spaceGrotesk = localFont({
  src: [
    { path: "../../public/fonts/SpaceGrotesk_500Medium.ttf", weight: "500", style: "normal" },
    { path: "../../public/fonts/SpaceGrotesk_700Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-space-grotesk",
  display: "swap",
})

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata")

  return {
    metadataBase: new URL(siteUrl),
    title: t("title"),
    description: t("description"),
    keywords: ["game art", "color palette", "game development", "color tool", "unity", "unreal", "game artist"],
    authors: [{ name: "Pixel Paw" }],
    openGraph: {
      title: t("title"),
      description: t("ogDescription"),
      type: "website",
    },
    other: {
      "google-adsense-account": "ca-pub-2165224388421574",
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()

  return (
    <html lang={locale} className="dark">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2165224388421574"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${spaceGrotesk.variable} font-sans antialiased`}>
        <NextIntlClientProvider>
          <AuthProvider>
            <ToastProvider>
              <div className="relative min-h-screen flex flex-col">
                <Header />
                <MobileAppBanner />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </ToastProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
