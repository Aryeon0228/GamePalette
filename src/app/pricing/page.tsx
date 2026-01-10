"use client"

import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const features = [
  { name: "Palette Extraction", free: true, pro: true },
  { name: "Style Filters", free: "1 (Original)", pro: "All (4)" },
  { name: "Saved Palettes", free: "10", pro: "Unlimited" },
  { name: "Value Check", free: true, pro: true },
  { name: "PNG/JSON/CSS Export", free: true, pro: true },
  { name: "Unity Export", free: false, pro: true },
  { name: "Unreal Export", free: false, pro: true },
  { name: "Cloud Sync", free: false, pro: true },
  { name: "Lighting Preview", free: false, pro: true },
  { name: "PBR Value Recommendations", free: false, pro: true },
  { name: "Ads", free: "Small banner", pro: "None" },
]

export default function PricingPage() {
  return (
    <div className="container py-16">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl font-bold">Simple, Fair Pricing</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Start free and upgrade when you need more power.
          All Pro features included for one low monthly price.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <div className="rounded-xl border border-border bg-card p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Free</h2>
            <p className="text-muted-foreground">Perfect for trying out</p>
          </div>

          <div className="space-y-1">
            <div className="text-4xl font-bold">$0</div>
            <div className="text-sm text-muted-foreground">Forever free</div>
          </div>

          <Button variant="outline" className="w-full" size="lg">
            Get Started
          </Button>

          <div className="space-y-3">
            {features.map((feature) => (
              <FeatureRow
                key={feature.name}
                name={feature.name}
                value={feature.free}
              />
            ))}
          </div>
        </div>

        {/* Pro Plan */}
        <div className="relative rounded-xl border-2 border-primary bg-card p-8 space-y-6">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-sm font-medium">
              Most Popular
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Pro</h2>
            <p className="text-muted-foreground">For serious game artists</p>
          </div>

          <div className="space-y-1">
            <div className="text-4xl font-bold">
              $3.99
              <span className="text-lg font-normal text-muted-foreground">/mo</span>
            </div>
            <div className="text-sm text-muted-foreground">Billed monthly</div>
          </div>

          <Button className="w-full bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600" size="lg">
            Upgrade to Pro
          </Button>

          <div className="space-y-3">
            {features.map((feature) => (
              <FeatureRow
                key={feature.name}
                name={feature.name}
                value={feature.pro}
                highlight
              />
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-2xl mx-auto mt-16 space-y-8">
        <h2 className="text-2xl font-bold text-center">Frequently Asked Questions</h2>

        <div className="space-y-6">
          <FAQItem
            question="Can I cancel anytime?"
            answer="Yes! You can cancel your Pro subscription at any time. You'll continue to have access to Pro features until the end of your billing period."
          />
          <FAQItem
            question="What payment methods do you accept?"
            answer="We accept all major credit cards (Visa, MasterCard, American Express) through our secure payment partner, Stripe."
          />
          <FAQItem
            question="Do you offer refunds?"
            answer="Yes, we offer a 7-day money-back guarantee. If you're not satisfied with Pro, contact us for a full refund."
          />
          <FAQItem
            question="Can I use GamePalette for commercial projects?"
            answer="Absolutely! Both Free and Pro plans allow commercial use. Create palettes for any game project."
          />
          <FAQItem
            question="Is my data safe?"
            answer="Your palettes are stored securely. Free users have local storage, Pro users get encrypted cloud sync."
          />
        </div>
      </div>
    </div>
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
            <Check className={cn("h-5 w-5", highlight ? "text-green-500" : "text-muted-foreground")} />
          ) : (
            <X className="h-5 w-5 text-muted-foreground/50" />
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
