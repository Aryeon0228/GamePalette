"use client"

import { useTransition } from "react"
import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { IoLanguageOutline } from "react-icons/io5"
import { setUserLocale } from "@/i18n/locale"
import { locales, localeNames, type Locale } from "@/i18n/config"
import { cn } from "@/lib/utils"

interface LocaleSwitcherProps {
  className?: string
}

export function LocaleSwitcher({ className }: LocaleSwitcherProps) {
  const locale = useLocale() as Locale
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleChange = (next: Locale) => {
    if (next === locale) return
    startTransition(async () => {
      await setUserLocale(next)
      router.refresh()
    })
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border border-border bg-card/70 p-0.5",
        isPending && "opacity-60",
        className
      )}
    >
      <IoLanguageOutline className="h-3.5 w-3.5 text-muted-foreground ml-1.5" />
      {locales.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => handleChange(option)}
          disabled={isPending}
          className={cn(
            "px-2 py-1 rounded-full text-xs font-medium transition-colors",
            locale === option
              ? "bg-primary/20 text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={locale === option}
        >
          {localeNames[option]}
        </button>
      ))}
    </div>
  )
}
