"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Palette, Library, CreditCard, Menu, X, User, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, isPremium, loading } = useAuth()

  const navItems = [
    { href: "/", label: "Home", icon: Palette },
    { href: "/library", label: "Library", icon: Library },
    // { href: "/pricing", label: "Pricing", icon: CreditCard }, // 임시 비활성화
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-pink-500">
            <Palette className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
            GamePalette
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary",
                pathname === item.href
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          {user ? (
            <Link
              href="/login"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
            >
              <User className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">
                {user.email?.split("@")[0] || "Account"}
              </span>
              {isPremium && (
                <Crown className="w-4 h-4 text-yellow-500" />
              )}
            </Link>
          ) : !loading && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Login</Link>
            </Button>
          )}
          <Button size="sm" asChild>
            <Link href="/create">Create Palette</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border">
          <nav className="container py-4 flex flex-col space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors",
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="pt-4 border-t border-border flex flex-col space-y-2">
              {user ? (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  {user.user_metadata?.avatar_url ? (
                    <Image
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-full"
                      unoptimized
                    />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">
                    {user.user_metadata?.full_name || user.email?.split("@")[0] || "Account"}
                  </span>
                  {isPremium && (
                    <Crown className="w-4 h-4 text-yellow-500" />
                  )}
                </Link>
              ) : (
                <Button variant="ghost" asChild className="justify-start">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    Login
                  </Link>
                </Button>
              )}
              <Button asChild>
                <Link href="/create" onClick={() => setMobileMenuOpen(false)}>
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
