import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, ArrowRight, Loader2 } from 'lucide-react'
import { usePlans } from '@/hooks/useSubscription'
import { useAuth } from '@/context/AuthContext'

// Real plan data comes from GET /api/plans (public endpoint, no auth) via
// usePlans() — the same hook UpgradePage.jsx uses. Styling here is new
// (dark theme) since UpgradePage's PlanCard is light-themed and not
// exported; the underlying data source is identical, nothing invented.
export default function PricingSection() {
  const [billingCycle, setBillingCycle] = useState('monthly')
  const { data: plans, isLoading, isError } = usePlans()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleSelect = (plan) => {
    if (!isAuthenticated) {
      navigate(plan.price_monthly === 0 ? '/register' : `/register?plan=${plan.slug}&billing=${billingCycle}`)
      return
    }
    navigate('/upgrade')
  }

  return (
    <section id="pricing" className="relative py-28 bg-[#05060a]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <span className="text-xs font-medium text-cyan-300 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-3 py-1">
            Pricing
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl font-bold text-white tracking-tight text-balance">
            Start free. Scale when you're ready.
          </h2>
        </div>

        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
            {['monthly', 'yearly'].map(cycle => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                  billingCycle === cycle ? 'bg-white text-[#05060a]' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {cycle}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 text-white/30 animate-spin" />
          </div>
        )}

        {isError && (
          <p className="text-center text-white/40 text-sm py-16">
            Plans are temporarily unavailable — please try again shortly.
          </p>
        )}

        {!isLoading && !isError && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(plans || []).map((plan, i) => {
              const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly
              const isFree = price === 0
              const displayPrice = billingCycle === 'yearly' && !isFree ? (price / 12).toFixed(0) : price

              return (
                <motion.div
                  key={plan.slug}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
                  className={`relative rounded-2xl border p-6 flex flex-col gap-4 ${
                    plan.is_featured
                      ? 'border-cyan-400/40 bg-gradient-to-b from-cyan-400/[0.06] to-violet-500/[0.03]'
                      : 'border-white/10 bg-white/[0.02]'
                  }`}
                >
                  {plan.is_featured && (
                    <span className="absolute -top-3 left-6 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 text-[#05060a]">
                      Most popular
                    </span>
                  )}

                  <div>
                    <h3 className="text-base font-semibold text-white">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-xs text-white/45 mt-1">{plan.description}</p>
                    )}
                  </div>

                  <div className="flex items-end gap-1">
                    {isFree ? (
                      <span className="text-3xl font-bold text-white">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-white">${displayPrice}</span>
                        <span className="text-white/40 text-sm pb-1">/mo</span>
                      </>
                    )}
                  </div>

                  {plan.has_trial && plan.trial_days > 0 && (
                    <p className="text-xs text-cyan-300/80 -mt-2">{plan.trial_days}-day free trial included</p>
                  )}

                  <ul className="space-y-2 flex-1">
                    {(plan.features || []).slice(0, 6).map(feature => (
                      <li key={feature} className="flex items-start gap-2 text-xs text-white/60">
                        <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        {feature.replace(/_/g, ' ')}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSelect(plan)}
                    className={`w-full text-sm font-semibold py-2.5 rounded-lg transition-opacity flex items-center justify-center gap-1.5 ${
                      plan.is_featured
                        ? 'bg-gradient-to-r from-cyan-400 to-violet-500 text-[#05060a] hover:opacity-90'
                        : 'bg-white/10 text-white hover:bg-white/15'
                    }`}
                  >
                    {isFree ? 'Get started' : 'Choose plan'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
