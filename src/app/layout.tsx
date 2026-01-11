import type { Metadata } from "next"
import "./globals.css"
import { Header } from "@/components/Header"
import { ToastProvider } from "@/components/ui/toast"

export const metadata: Metadata = {
  title: "GamePalette - Color Palette Tool for Game Artists",
  description: "Extract, transform, and export color palettes optimized for game development. Features style filters, value check, and Unity/Unreal export.",
  keywords: ["game art", "color palette", "game development", "color tool", "unity", "unreal", "game artist"],
  authors: [{ name: "GamePalette" }],
  openGraph: {
    title: "GamePalette - Color Palette Tool for Game Artists",
    description: "Extract, transform, and export color palettes optimized for game development.",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <ToastProvider>
          <div className="relative min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-border py-6 mt-auto">
              <div className="container text-center text-sm text-muted-foreground">
                <p>GamePalette - Color Palette Tool for Game Artists</p>
                <p className="mt-1">Made with care for the game dev community</p>
              </div>
            </footer>
          </div>
        </ToastProvider>
      </body>
    </html>
  )
}
