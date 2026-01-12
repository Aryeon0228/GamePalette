"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, LogOut, Crown, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"

function LoginContent() {
  const { user, loading, isPremium, signInWithGoogle, signOut } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get("error") === "auth_failed") {
      setError("Authentication failed. Please try again.")
    }
  }, [searchParams])

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
      setError(`Failed to sign in: ${errorMessage}`)
      setIsSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.refresh()
    } catch {
      setError("Failed to sign out. Please try again.")
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="container py-16 max-w-md flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Show user profile if logged in
  if (user) {
    return (
      <div className="container py-16 max-w-md">
        <Button variant="ghost" size="sm" asChild className="mb-8">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        <div className="rounded-xl border border-border bg-card p-8 space-y-6">
          <div className="text-center space-y-4">
            {user.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="w-20 h-20 rounded-full mx-auto"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {user.user_metadata?.full_name || "Welcome!"}
              </h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className={isPremium ? "text-primary font-medium flex items-center gap-1" : ""}>
                {isPremium && <Crown className="h-4 w-4 text-yellow-500" />}
                {isPremium ? "Pro" : "Free"}
              </span>
            </div>
            {!isPremium && (
              <p className="text-xs text-muted-foreground">
                Upgrade to Pro for cloud sync and premium features
              </p>
            )}
          </div>

          {isPremium ? (
            <Button variant="outline" className="w-full" asChild>
              <Link href="/pricing">
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Subscription
              </Link>
            </Button>
          ) : (
            <Button className="w-full bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600" asChild>
              <Link href="/pricing">Upgrade to Pro</Link>
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
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
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
      </Button>

      <div className="rounded-xl border border-border bg-card p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Welcome to GamePalette</h1>
          <p className="text-muted-foreground">
            Sign in to sync your palettes across devices
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
            <Loader2 className="h-5 w-5 animate-spin" />
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
              Continue with Google
            </>
          )}
        </Button>

        <div className="space-y-3 pt-4 border-t border-border">
          <h3 className="text-sm font-medium text-center">Why sign in?</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">*</span>
              <span>Free: Save palettes locally on this device</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">*</span>
              <span>Premium: Sync palettes across all your devices</span>
            </li>
          </ul>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        By continuing, you agree to our{" "}
        <Link href="#" className="underline">Terms of Service</Link>
        {" "}and{" "}
        <Link href="#" className="underline">Privacy Policy</Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="container py-16 max-w-md flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
