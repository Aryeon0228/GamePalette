import type { Metadata } from "next"
import Script from "next/script"
import localFont from "next/font/local"
import { IBM_Plex_Sans_KR } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"
import "./globals.css"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { ToastProvider } from "@/components/ui/toast"
import { AuthProvider } from "@/contexts/AuthContext"

const ibmPlexSans = localFont({
  src: [{ path: "../../public/fonts/IBMPlexSansLatin.woff2", weight: "300 700", style: "normal" }],
  variable: "--font-ibm-plex-sans",
  display: "swap",
})

const ibmPlexMono = localFont({
  src: [
    { path: "../../public/fonts/IBMPlexMono400Latin.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/IBMPlexMono500Latin.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-ibm-plex-mono",
  display: "swap",
})

// Korean text uses IBM Plex Sans KR, the same family as the other Studio Penumbra labs.
const ibmPlexSansKr = IBM_Plex_Sans_KR({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  preload: false,
  variable: "--font-ibm-plex-sans-kr",
  display: "swap",
})

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata")

  return {
    metadataBase: new URL(siteUrl),
    title: "Color Lab | Studio Penumbra",
    description: t("description"),
    keywords: ["game art", "color palette", "game development", "color tool", "unity", "unreal", "game artist"],
    authors: [{ name: "Studio Penumbra" }],
    openGraph: {
      title: "Color Lab | Studio Penumbra",
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
          strategy="afterInteractive"
        />
      </head>
      <body className={`${ibmPlexSans.variable} ${ibmPlexSansKr.variable} ${ibmPlexMono.variable} font-sans antialiased`}>
        <NextIntlClientProvider>
          <AuthProvider>
            <ToastProvider>
              <div className="relative min-h-screen flex flex-col">
                <Header />
                <main id="main-content" className="flex-1 min-w-0" tabIndex={-1}>{children}</main>
                <Footer />
              </div>
            </ToastProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
