"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { IoCloseOutline, IoLogoAppleAppstore, IoPhonePortraitOutline } from "react-icons/io5"

const DISMISS_KEY = "pixelpaw_mobile_banner_dismissed"
const SESSION_HIDE_KEY = "pixelpaw_mobile_banner_session_hidden"
const MOBILE_APP_URL = process.env.NEXT_PUBLIC_MOBILE_APP_URL || "https://apps.apple.com/app/pixel-paw"
const AUTO_HIDE_MS = 12000

export function MobileAppBanner() {
  const pathname = usePathname()
  const t = useTranslations("mobileBanner")
  const [isReady, setIsReady] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isSessionHidden, setIsSessionHidden] = useState(false)
  const isHome = pathname === "/"

  useEffect(() => {
    const dismissed = window.localStorage.getItem(DISMISS_KEY) === "true"
    const hiddenInSession = window.sessionStorage.getItem(SESSION_HIDE_KEY) === "true"
    setIsDismissed(dismissed)
    setIsSessionHidden(hiddenInSession)
    setIsReady(true)
  }, [pathname])

  useEffect(() => {
    if (!isReady || !isHome || isDismissed || isSessionHidden) return

    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem(SESSION_HIDE_KEY, "true")
      setIsSessionHidden(true)
    }, AUTO_HIDE_MS)

    return () => window.clearTimeout(timer)
  }, [isDismissed, isHome, isReady, isSessionHidden])

  const handleDismissPermanently = () => {
    window.localStorage.setItem(DISMISS_KEY, "true")
    setIsDismissed(true)
  }

  const handleShowAgain = () => {
    window.localStorage.removeItem(DISMISS_KEY)
    window.sessionStorage.removeItem(SESSION_HIDE_KEY)
    setIsDismissed(false)
    setIsSessionHidden(false)
  }

  if (!isReady || !isHome) {
    return null
  }

  const isVisible = !isDismissed && !isSessionHidden

  return (
    <div className="fixed right-4 bottom-4 z-50">
      {isVisible ? (
        <div className="relative w-60 rounded-xl border border-border bg-card p-3 pr-7 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
          <button
            type="button"
            onClick={handleDismissPermanently}
            aria-label={t("dismiss")}
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <IoCloseOutline className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 text-white">
              <IoPhonePortraitOutline className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-snug">{t("title")}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{t("subtitle")}</p>
              <a
                href={MOBILE_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
              >
                <IoLogoAppleAppstore className="h-3.5 w-3.5" />
                {t("storeButton")}
              </a>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleShowAgain}
          aria-label={t("title")}
          title={t("title")}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-[0_6px_20px_rgba(0,0,0,0.25)] transition-transform hover:scale-105"
        >
          <IoPhonePortraitOutline className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
