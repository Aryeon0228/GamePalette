"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  IoArrowBackOutline,
  IoRefreshOutline,
  IoLogOutOutline,
  IoSparklesOutline,
  IoCardOutline,
} from "react-icons/io5"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"

function LoginContent() {
  const t = useTranslations("login")
  const { user, loading, isPremium, signInWithGoogle, signOut } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get("error") === "auth_failed") {
      setError(t("authFailed"))
    }
  }, [searchParams, t])

  const handleGoogleLogin = async () => {
    try {
      setIsSigningIn(true)
      setError(null)
      console.log('Starting Google login...')
      await signInWithGoogle()
      console.log('Google login initiated successfully')
    } catch (err) {
      console.error('Google login error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(t("signInFail", { message: errorMessage }))
      setIsSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.refresh()
    } catch {
      setError(t("signOutFail"))
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="container py-16 max-w-md flex justify-center">
        <IoRefreshOutline className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Show user profile if logged in
  if (user) {
    return (
      <div className="container py-16 max-w-md">
        <Button variant="ghost" size="sm" asChild className="mb-8">
          <Link href="/">
            <IoArrowBackOutline className="h-4 w-4 mr-2" />
            {t("backToHome")}
          </Link>
        </Button>

        <div className="rounded-xl border border-border bg-card p-8 space-y-6">
          <div className="text-center space-y-4">
            {user.user_metadata?.avatar_url && (
              <Image
                src={user.user_metadata.avatar_url}
                alt="Profile"
                width={80}
                height={80}
                className="w-20 h-20 rounded-full mx-auto"
                unoptimized
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {user.user_metadata?.full_name || t("welcomeUser")}
              </h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">{t("plan")}</span>
              <span className={isPremium ? "text-primary font-medium flex items-center gap-1" : ""}>
                {isPremium && <IoSparklesOutline className="h-4 w-4 text-yellow-500" />}
                {isPremium ? t("pro") : t("free")}
              </span>
            </div>
            {!isPremium && (
              <p className="text-xs text-muted-foreground">
                {t("upgradeHint")}
              </p>
            )}
          </div>

          {isPremium ? (
            <Button variant="outline" className="w-full" asChild>
              <Link href="/pricing">
                <IoCardOutline className="h-4 w-4 mr-2" />
                {t("manageSubscription")}
              </Link>
            </Button>
          ) : (
            <Button className="w-full bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-700 hover:to-cyan-600" asChild>
              <Link href="/pricing">{t("upgradeToPro")}</Link>
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={handleSignOut}
          >
            <IoLogOutOutline className="h-4 w-4 mr-2" />
            {t("signOut")}
          </Button>
        </div>
      </div>
    )
  }

  // Show login form
  return (
    <div className="container py-16 max-w-md">
      <Button variant="ghost" size="sm" asChild className="mb-8">
        <Link href="/">
          <IoArrowBackOutline className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
      </Button>

      <div className="rounded-xl border border-border bg-card p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{t("welcomeTitle")}</h1>
          <p className="text-muted-foreground">
            {t("welcomeSubtitle")}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full h-12"
          onClick={handleGoogleLogin}
          disabled={isSigningIn}
        >
          {isSigningIn ? (
            <IoRefreshOutline className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t("continueWithGoogle")}
            </>
          )}
        </Button>

        <div className="space-y-3 pt-4 border-t border-border">
          <h3 className="text-sm font-medium text-center">{t("whySignIn")}</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">*</span>
              <span>{t("benefitFree")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">*</span>
              <span>{t("benefitPremium")}</span>
            </li>
          </ul>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        {t.rich("agree", {
          terms: (c) => <Link href="#" className="underline">{c}</Link>,
          privacy: (c) => <Link href="#" className="underline">{c}</Link>,
        })}
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="container py-16 max-w-md flex justify-center">
        <IoRefreshOutline className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
