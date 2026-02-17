"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { IoCloseOutline, IoLogoGithub, IoPhonePortraitOutline, IoRefreshOutline } from "react-icons/io5"
import { Button } from "@/components/ui/button"

const DISMISS_KEY = "pixelpaw_mobile_banner_dismissed"
const SESSION_HIDE_KEY = "pixelpaw_mobile_banner_session_hidden"
const MOBILE_REPO_URL = "https://github.com/Aryeon0228/GamePalette-Mobile"
const AUTO_HIDE_MS = 12000

export function MobileAppBanner() {
  const pathname = usePathname()
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
    <>
      {isVisible && (
        <div className="border-b border-[#2d2d38] bg-gradient-to-r from-[#3b426a]/90 to-[#4f7bb8]/90">
          <div className="container py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-2.5 text-white">
              <IoPhonePortraitOutline className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="text-sm leading-relaxed">
                <p className="font-semibold">Pixel Paw 모바일 버전도 운영 중입니다.</p>
                <p className="text-white/85 text-xs">모바일 최신 기능은 아래 저장소에서 바로 확인할 수 있어요.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={MOBILE_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" className="bg-white/16 hover:bg-white/22 border border-white/25 text-white">
                  <IoLogoGithub className="h-4 w-4 mr-1.5" />
                  Mobile Repo
                </Button>
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white hover:bg-white/20 hover:text-white"
                onClick={handleDismissPermanently}
                aria-label="Dismiss mobile banner"
              >
                <IoCloseOutline className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {!isVisible && (
        <div className="fixed right-4 bottom-4 z-50">
          <Button
            size="sm"
            className="bg-[#3b426a] hover:bg-[#33385d] shadow-[0_6px_20px_rgba(0,0,0,0.35)]"
            onClick={handleShowAgain}
          >
            <IoRefreshOutline className="h-4 w-4 mr-1.5" />
            모바일 배너 다시 보기
          </Button>
        </div>
      )}
    </>
  )
}
