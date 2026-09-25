import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Check, Zap, Building2, User, Star, ArrowRight } from 'lucide-react'
import { usePlans, useCheckout, useCurrentSubscription } from '@/hooks/useSubscription'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// ── Couleurs par plan ─────────────────────────────────────────
const PLAN_COLORS = {
  free_trial:         { bg: 'bg-gray-50',    border: 'border-gray-200',   text: 'text-gray-700',   btn: 'bg-gray-600 hover:bg-gray-700' },
  normal_basic:       { bg: 'bg-teal-50',    border: 'border-teal-200',   text: 'text-teal-700',   btn: 'bg-teal-600 hover:bg-teal-700' },
  normal_pro:         { bg: 'bg-violet-50',  border: 'border-violet-300', text: 'text-violet-700', btn: 'bg-violet-600 hover:bg-violet-700' },
  business_standard:  { bg: 'bg-blue-50',    border: 'border-blue-200',   text: 'text-blue-700',   btn: 'bg-blue-600 hover:bg-blue-700' },
  business_premium:   { bg: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-700', btn: 'bg-orange-600 hover:bg-orange-700' },
}

// ── Labels lisibles des features ──────────────────────────────
const FEATURE_LABELS = {
  smart_scheduler:          '✅ Planificateur intelligent',
  caption_generator:        '✅ Générateur de légendes IA',
  hashtag_suggester:        '✅ Suggestions de hashtags',
  auto_comment_responder:   '✅ Répondeur automatique aux commentaires',
  weekly_performance_summary: '✅ Résumé de performance hebdomadaire',
  ai_content_calendar:      '✅ Calendrier de contenu IA',
  account_manager_agent:    '✅ Agent Chef de Compte IA',
  social_manager_agent:     '✅ Agent Gestionnaire Réseaux Sociaux',
  content_strategist_agent: '✅ Agent Stratège de Contenu',
  content_creator_agent:    '✅ Agent Créateur de Contenu IA',
  analytics_agent:          '✅ Agent Analytics IA',
  ads_optimizer_agent:      '✅ Agent Optimisation Publicitaire',
  competitor_intel_agent:   '✅ Agent Veille Concurrentielle',
  client_billing:           '✅ Facturation client (Stripe Connect)',
  white_label_reports:      '✅ Rapports en marque blanche',
}

// ── Carte d'un plan ───────────────────────────────────────────
function PlanCard({ plan, billingCycle, isCurrentPlan, onSelect, loading }) {
  const colors   = PLAN_COLORS[plan.slug] || PLAN_COLORS.free_trial
  const price    = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly
  const isFree   = price === 0
  const savings  = plan.price_monthly > 0
    ? Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative rounded-2xl border-2 p-6 flex flex-col gap-4 transition-all duration-200',
        colors.bg, colors.border,
        plan.is_featured && 'shadow-lg scale-[1.02]',
        isCurrentPlan && 'ring-2 ring-violet-500 ring-offset-2'
      )}
    >
      {/* Badge "Populaire" */}
      {plan.is_featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 bg-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
            <Star className="h-3 w-3" />
            Populaire
          </span>
        </div>
      )}

      {/* Badge plan actuel */}
      {isCurrentPlan && (
        <div className="absolute -top-3 right-4">
          <span className="inline-flex items-center gap-1 bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
            <Check className="h-3 w-3" />
            Plan actuel
          </span>
        </div>
      )}

      {/* En-tête */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          {plan.type === 'business'
            ? <Building2 className={cn('h-4 w-4', colors.text)} />
            : <User className={cn('h-4 w-4', colors.text)} />
          }
          <span className={cn('text-xs font-semibold uppercase tracking-wide', colors.text)}>
            {plan.type === 'business' ? 'Business' : 'Standard'}
          </span>
        </div>
        <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
        {plan.description && (
          <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>
        )}
      </div>

      {/* Prix */}
      <div>
        {isFree ? (
          <div className="text-3xl font-bold text-gray-900">Gratuit</div>
        ) : (
          <div className="flex items-end gap-1">
            <span className="text-3xl font-bold text-gray-900">
              ${billingCycle === 'yearly' ? (price / 12).toFixed(0) : price}
            </span>
            <span className="text-gray-500 text-sm pb-1">/mois</span>
          </div>
        )}

        {/* Économies annuelles */}
        {billingCycle === 'yearly' && savings > 0 && (
          <span className="inline-block mt-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            Économisez {savings}% par an
          </span>
        )}

        {/* Essai gratuit */}
        {plan.has_trial && plan.trial_days > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {plan.trial_days} jours d'essai gratuit inclus
          </p>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-1.5 flex-1">
        {(plan.features || []).map((feature) => (
          <li key={feature} className="text-sm text-gray-700">
            {FEATURE_LABELS[feature] || `✅ ${feature}`}
          </li>
        ))}
        {/* Limites */}
        {plan.limits?.posts_per_month && (
          <li className="text-sm text-gray-500">
            📊 {plan.limits.posts_per_month === -1
              ? 'Publications illimitées'
              : `${plan.limits.posts_per_month} publications/mois`
            }
          </li>
        )}
        {plan.limits?.social_accounts && (
          <li className="text-sm text-gray-500">
            📱 {plan.limits.social_accounts === -1
              ? 'Comptes sociaux illimités'
              : `${plan.limits.social_accounts} compte(s) social`
            }
          </li>
        )}
        {plan.limits?.clients && (
          <li className="text-sm text-gray-500">
            👥 {plan.limits.clients === -1
              ? 'Clients illimités'
              : `${plan.limits.clients} client(s)`
            }
          </li>
        )}
      </ul>

      {/* Bouton */}
      <Button
        className={cn(
          'w-full text-white',
          colors.btn,
          isCurrentPlan && 'opacity-60 cursor-not-allowed'
        )}
        disabled={isCurrentPlan || loading}
        loading={loading}
        onClick={() => !isCurrentPlan && onSelect(plan)}
      >
        {isCurrentPlan ? 'Plan actuel' : isFree ? 'Commencer' : (
          <span className="flex items-center gap-1.5">
            Choisir ce plan <ArrowRight className="h-4 w-4" />
          </span>
        )}
      </Button>
    </motion.div>
  )
}

// ── Page principale ───────────────────────────────────────────
export default function UpgradePage() {
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [selectedType, setSelectedType] = useState('standard')
  const [loadingPlan, setLoadingPlan]   = useState(null)

  const { user, isAuthenticated }    = useAuth()
  const navigate = useNavigate()
  const { data: plans, isLoading } = usePlans()
  const { data: subscription }     = useCurrentSubscription()
  const checkoutMutation = useCheckout()

  const filteredPlans = (plans || []).filter(p =>
    selectedType === 'all' ? true : p.type === selectedType
  )

  const handleSelectPlan = (plan) => {
    // Plan gratuit — pas de checkout Stripe (rien à facturer)
    if (plan.price_monthly === 0) {
      if (!isAuthenticated) {
        navigate('/register')
        return
      }
      // Connecté et pas déjà sur ce plan : le passage à un plan gratuit se
      // fait via l'annulation de l'abonnement actuel, pas ce bouton — sans
      // ce message, cliquer ici ne faisait strictement rien de visible.
      toast.info('Pour repasser au plan gratuit, annulez votre abonnement actuel depuis les paramètres de facturation.')
      return
    }

    // Non connecté → redirige vers register avec le plan
    if (!isAuthenticated) {
      navigate(`/register?plan=${plan.slug}&billing=${billingCycle}`)
      return
    }
    // Connecté → lance le checkout Stripe
    setLoadingPlan(plan.slug)
    checkoutMutation.mutate(
      { planSlug: plan.slug, billingCycle },
      { onSettled: () => setLoadingPlan(null) }
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">

        {/* En-tête */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              <Zap className="h-4 w-4" />
              Choisissez votre plan
            </span>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Automatisez votre marketing avec l'IA
            </h1>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Commencez gratuitement. Passez à un plan supérieur quand vous êtes prêt.
            </p>
          </motion.div>
        </div>

        {/* Sélecteur type de compte */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
            {[
              { value: 'standard', label: 'Utilisateur', Icon: User },
              { value: 'business', label: 'Business', Icon: Building2 },
            ].map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setSelectedType(value)}
                className={cn(
                  'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all',
                  selectedType === value
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle mensuel/annuel */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className={cn(
            'text-sm font-medium',
            billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-400'
          )}>
            Mensuel
          </span>
          <button
            onClick={() => setBillingCycle(c => c === 'monthly' ? 'yearly' : 'monthly')}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors duration-200',
              billingCycle === 'yearly' ? 'bg-violet-600' : 'bg-gray-300'
            )}
          >
            <span className={cn(
              'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
              billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-1'
            )} />
          </button>
          <span className={cn(
            'text-sm font-medium',
            billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-400'
          )}>
            Annuel
            <span className="ml-1.5 text-xs text-green-600 font-semibold">-20%</span>
          </span>
        </div>

        {/* Grille des plans */}
        <div className={cn(
          'grid gap-6',
          filteredPlans.length <= 2 ? 'max-w-2xl mx-auto grid-cols-1 md:grid-cols-2' :
          filteredPlans.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        )}>
          {filteredPlans.map(plan => (
            <PlanCard
              key={plan.slug}
              plan={plan}
              billingCycle={billingCycle}
              isCurrentPlan={user?.current_plan === plan.slug}
              onSelect={handleSelectPlan}
              loading={loadingPlan === plan.slug && checkoutMutation.isPending}
            />
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Des questions ?{' '}
            <a href="mailto:support@socialmindai.com" className="text-violet-600 hover:underline">
              Contactez notre équipe
            </a>
            {' '}— Paiements sécurisés par{' '}
            <span className="font-semibold text-gray-700">Stripe</span>
          </p>

          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-400">
            <span>✅ Annulation à tout moment</span>
            <span>✅ Remboursement sous 30 jours</span>
            <span>✅ Paiement sécurisé SSL</span>
          </div>
        </div>

      </div>
    </div>
  )
}