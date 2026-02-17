"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import type { IconType } from "react-icons"
import {
  IoAddCircleOutline,
  IoColorPaletteOutline,
  IoLibraryOutline,
  IoLogInOutline,
  IoMenuOutline,
  IoCloseOutline,
  IoPersonCircleOutline,
  IoSparklesOutline,
  IoPawOutline,
} from "react-icons/io5"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"

interface NavItem {
  href: string
  label: string
  icon: IconType
}

const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: IoColorPaletteOutline },
  { href: "/library", label: "Library", icon: IoLibraryOutline },
]

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, isPremium, loading } = useAuth()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/92 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-[0_0_18px_rgba(79,123,184,0.35)]">
            <Image src="/pow-header.png" alt="Pixel Paw logo" width={22} height={22} priority />
          </div>
          <div className="leading-none">
            <p className="font-display text-xl font-bold tracking-[-0.02em] text-foreground">Pixel Paw</p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <span>Color Extractor</span>
              <IoPawOutline className="h-3.5 w-3.5" />
            </p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center space-x-2 rounded-full border border-border bg-card/70 px-2 py-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary/20 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <Link
              href="/login"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
            >
              <IoPersonCircleOutline className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {user.email?.split("@")[0] || "Account"}
              </span>
              {isPremium && <IoSparklesOutline className="w-4 h-4 text-[#fbbf24]" />}
            </Link>
          ) : !loading && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">
                <IoLogInOutline className="h-4 w-4 mr-1.5" />
                Login
              </Link>
            </Button>
          )}

          <Button size="sm" className="bg-primary hover:bg-primary/90" asChild>
            <Link href="/create">
              <IoAddCircleOutline className="h-4 w-4 mr-1.5" />
              Create Palette
            </Link>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <IoCloseOutline className="h-5 w-5" /> : <IoMenuOutline className="h-5 w-5" />}
        </Button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card/85 backdrop-blur-sm">
          <nav className="container py-4 flex flex-col space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium",
                  pathname === item.href ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}

            <div className="pt-3 border-t border-border flex flex-col gap-2">
              {user ? (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <IoPersonCircleOutline className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {user.user_metadata?.full_name || user.email?.split("@")[0] || "Account"}
                  </span>
                  {isPremium && <IoSparklesOutline className="w-4 h-4 text-[#fbbf24]" />}
                </Link>
              ) : (
                <Button variant="ghost" asChild className="justify-start">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <IoLogInOutline className="h-4 w-4 mr-1.5" />
                    Login
                  </Link>
                </Button>
              )}

              <Button className="bg-primary hover:bg-primary/90" asChild>
                <Link href="/create" onClick={() => setMobileMenuOpen(false)}>
                  <IoAddCircleOutline className="h-4 w-4 mr-1.5" />
                  Create Palette
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
