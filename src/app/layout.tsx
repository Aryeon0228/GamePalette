import type { Metadata } from "next"
import "./globals.css"
import { Header } from "@/components/Header"
import { ToastProvider } from "@/components/ui/toast"
import { AuthProvider } from "@/contexts/AuthContext"

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
        <AuthProvider>
          <ToastProvider>
            <div className="relative min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <footer className="border-t border-border py-6 mt-auto">
                <div className="container text-center text-sm text-muted-foreground space-y-2">
                  <p>GamePalette - Color Palette Tool for Game Artists</p>
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
