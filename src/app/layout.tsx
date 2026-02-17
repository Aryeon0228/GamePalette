import type { Metadata } from "next"
import Script from "next/script"
import localFont from "next/font/local"
import "./globals.css"
import { Header } from "@/components/Header"
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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Pixel Paw - Color Palette Tool for Game Artists",
  description: "Extract, transform, and export color palettes optimized for game development. Includes style presets, value check, and Unity/Unreal export.",
  keywords: ["game art", "color palette", "game development", "color tool", "unity", "unreal", "game artist"],
  authors: [{ name: "Pixel Paw" }],
  openGraph: {
    title: "Pixel Paw - Color Palette Tool for Game Artists",
    description: "Extract, transform, and export color palettes optimized for game development.",
    type: "website",
  },
  other: {
    "google-adsense-account": "ca-pub-2165224388421574",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2165224388421574"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${spaceGrotesk.variable} font-sans antialiased`}>
        <AuthProvider>
          <ToastProvider>
            <div className="relative min-h-screen flex flex-col">
              <Header />
              <MobileAppBanner />
              <main className="flex-1">{children}</main>
              <footer className="border-t border-border py-6 mt-auto">
                <div className="container text-center text-sm text-muted-foreground space-y-2">
                  <p>Pixel Paw - Color Palette Tool for Game Artists</p>
                  <p>
                    문의: <a href="mailto:cloudysnowyday@gmail.com" className="hover:text-foreground transition-colors">cloudysnowyday@gmail.com</a>
                    {" | "}
                    Discord: <span className="hover:text-foreground">@cloudysnowyday</span>
                  </p>
                  <p className="mt-1">Twitter: <a href="https://twitter.com/TomatoO_O" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">@TomatoO_O</a></p>
                </div>
              </footer>
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
