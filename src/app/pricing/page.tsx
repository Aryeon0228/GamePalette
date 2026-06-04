"use client"

import { Suspense, useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useSearchParams, useRouter } from "next/navigation"
import { IoCheckmarkOutline, IoCloseOutline, IoRefreshOutline } from "react-icons/io5"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"

const features = [
  { key: "extraction", free: true, pro: true },
  { key: "styleFilters", free: "styleFiltersFree", pro: "styleFiltersPro" },
  { key: "savedPalettes", free: "savedFree", pro: "savedPro" },
  { key: "valueCheck", free: true, pro: true },
  { key: "basicExport", free: true, pro: true },
  { key: "unityExport", free: false, pro: true },
  { key: "unrealExport", free: false, pro: true },
  { key: "cloudSync", free: false, pro: true },
  { key: "lightingPreview", free: false, pro: true },
  { key: "pbr", free: false, pro: true },
  { key: "ads", free: "adsFree", pro: "adsPro" },
]

function PricingContent() {
  const t = useTranslations("pricing")
  const { user, isPremium, loading: authLoading } = useAuth()
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setMessage({ type: 'success', text: t("paymentSuccess") })
    }
    if (searchParams.get('canceled') === 'true') {
      setMessage({ type: 'error', text: t("paymentCanceled") })
    }
  }, [searchParams, t])

  const handleUpgrade = async () => {
    if (!user) {
      router.push('/login?redirect=/pricing')
      return
    }

    setCheckoutLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/lemonsqueezy/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Lemon Squeezy Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Checkout error:', error)
      setMessage({ type: 'error', text: t("checkoutFail") })
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleManageSubscription = () => {
    // Lemon Squeezy customer portal - users manage subscriptions via email link
    // or we can open the Lemon Squeezy billing page
    window.open('https://app.lemonsqueezy.com/my-orders', '_blank')
  }

  return (
    <div className="container py-16">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl font-bold">{t("title")}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("subtitle")}
        </p>
      </div>

      {message && (
        <div className={cn(
          "max-w-md mx-auto mb-8 p-4 rounded-lg text-center",
          message.type === 'success' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
        )}>
          {message.text}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <div className="rounded-xl border border-border bg-card p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold">{t("free")}</h2>
            <p className="text-muted-foreground">{t("freeDesc")}</p>
          </div>

          <div className="space-y-1">
            <div className="text-4xl font-bold">$0</div>
            <div className="text-sm text-muted-foreground">{t("foreverFree")}</div>
          </div>

          <Button variant="outline" className="w-full" size="lg" asChild>
            <a href="/create">{t("getStarted")}</a>
          </Button>

          <div className="space-y-3">
            {features.map((feature) => (
              <FeatureRow
                key={feature.key}
                name={t(`feat.${feature.key}`)}
                value={typeof feature.free === "boolean" ? feature.free : t(`val.${feature.free}`)}
              />
            ))}
          </div>
        </div>

        {/* Pro Plan */}
        <div className="relative rounded-xl border-2 border-primary bg-card p-8 space-y-6">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="px-4 py-1 rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 text-white text-sm font-medium">
              {isPremium ? t("currentPlan") : t("mostPopular")}
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-bold">{t("pro")}</h2>
            <p className="text-muted-foreground">{t("proDesc")}</p>
          </div>

          <div className="space-y-1">
            <div className="text-4xl font-bold">
              $3.99
              <span className="text-lg font-normal text-muted-foreground">{t("perMonth")}</span>
            </div>
            <div className="text-sm text-muted-foreground">{t("billedMonthly")}</div>
          </div>

          {isPremium ? (
            <Button
              className="w-full"
              size="lg"
              variant="outline"
              onClick={handleManageSubscription}
            >
              {t("manageSubscription")}
            </Button>
          ) : (
            <Button
              className="w-full bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-700 hover:to-cyan-600"
              size="lg"
              onClick={handleUpgrade}
              disabled={checkoutLoading || authLoading}
            >
              {checkoutLoading ? (
                <>
                  <IoRefreshOutline className="mr-2 h-4 w-4 animate-spin" />
                  {t("loading")}
                </>
              ) : (
                t("upgradeToPro")
              )}
            </Button>
          )}

          <div className="space-y-3">
            {features.map((feature) => (
              <FeatureRow
                key={feature.key}
                name={t(`feat.${feature.key}`)}
                value={typeof feature.pro === "boolean" ? feature.pro : t(`val.${feature.pro}`)}
                highlight
              />
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-2xl mx-auto mt-16 space-y-8">
        <h2 className="text-2xl font-bold text-center">{t("faqTitle")}</h2>

        <div className="space-y-6">
          <FAQItem
            question={t("faq1Q")}
            answer={t("faq1A")}
          />
          <FAQItem
            question={t("faq2Q")}
            answer={t("faq2A")}
          />
          <FAQItem
            question={t("faq3Q")}
            answer={t("faq3A")}
          />
          <FAQItem
            question={t("faq4Q")}
            answer={t("faq4A")}
          />
          <FAQItem
            question={t("faq5Q")}
            answer={t("faq5A")}
          />
        </div>
      </div>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="container py-16 flex justify-center">
        <IoRefreshOutline className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <PricingContent />
    </Suspense>
  )
}

function FeatureRow({
  name,
  value,
  highlight,
}: {
  name: string
  value: boolean | string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={highlight ? "text-foreground" : "text-muted-foreground"}>
        {name}
      </span>
      <span>
        {typeof value === "boolean" ? (
          value ? (
            <IoCheckmarkOutline className={cn("h-5 w-5", highlight ? "text-green-500" : "text-muted-foreground")} />
          ) : (
            <IoCloseOutline className="h-5 w-5 text-muted-foreground/50" />
          )
        ) : (
          <span className={highlight ? "font-medium" : "text-muted-foreground"}>
            {value}
          </span>
        )}
      </span>
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="font-semibold mb-2">{question}</h3>
      <p className="text-sm text-muted-foreground">{answer}</p>
    </div>
  )
}
