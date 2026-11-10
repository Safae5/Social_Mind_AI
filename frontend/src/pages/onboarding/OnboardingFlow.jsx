import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import api from '@/lib/axios'
import logo from '@/assets/logo.png'
import { Wordmark } from '@/components/brand/Wordmark'

// ─── Configuration des 8 étapes ────────────────────────────────
const STEPS = [
  { id: 'welcome' },
  { id: 'profile',    title: 'Comment vous décrivez-vous ?' },
  { id: 'networks',   title: 'Sur quels réseaux êtes-vous actif ?' },
  { id: 'goal',       title: 'Quel est votre objectif principal ?' },
  { id: 'frequency',  title: 'À quelle fréquence publiez-vous ?' },
  { id: 'accounts',   title: 'Combien de comptes gérez-vous ?' },
  { id: 'categories', title: 'Choisissez vos catégories de contenu' },
  { id: 'voice',      title: 'Apprenez votre style de rédaction à l\'IA' },
]

const cn = (...classes) => classes.filter(Boolean).join(' ')

export default function OnboardingFlow() {
  const [step, setStep]       = useState(0)
  const [answers, setAnswers] = useState({})
  const [saving, setSaving]   = useState(false)
  const navigate              = useNavigate()
  const { user, updateUser }  = useAuth()

  const isFirst = step === 0
  const isLast  = step === STEPS.length - 1

  const handleAnswer = (key, value) => setAnswers(prev => ({ ...prev, [key]: value }))

  const handleNext = async () => {
    if (isLast) {
      setSaving(true)
      try {
        await api.post('/onboarding', {
          profile         : answers.profile,
          platforms        : answers.networks || [],
          objective        : answers.goal,
          post_frequency   : answers.frequency,
          accounts_count   : answers.accounts,
          brand_niche      : (answers.categories || []).join(', '),
          brand_examples   : [answers.voice1 || '', answers.voice2 || '', answers.voice3 || ''].filter(Boolean),
          onboarding_completed: true,
        })
        updateUser({ onboarding_completed: true })

        // Popup Marketplace si Small Business ou Personal Brand
        if (['small_business', 'personal_brand'].includes(answers.profile)) {
          navigate('/dashboard?marketplace=true')
        } else {
          navigate('/dashboard')
        }
      } catch (e) {
        console.error(e)
        navigate('/dashboard')
      } finally {
        setSaving(false)
      }
    } else {
      setStep(s => s + 1)
    }
  }

  const StepComponent = STEP_COMPONENTS[STEPS[step].id]

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          {!isFirst && (
            <button onClick={() => setStep(s => s - 1)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <img src={logo} alt="Social Mind AI" className="w-7 h-7 object-contain" />
            <Wordmark theme="light" className="font-bold text-sm" />
          </div>
        </div>

        {/* Progress dots */}
        {!isFirst && (
          <div className="flex gap-2">
            {STEPS.slice(1).map((_, i) => (
              <div key={i} className={cn(
                'w-2 h-2 rounded-full transition-colors',
                i < step - 1 ? 'bg-green-500' : i === step - 1 ? 'bg-gray-900' : 'bg-gray-300'
              )} />
            ))}
          </div>
        )}

        <button onClick={() => navigate('/dashboard')}
                className="text-sm text-gray-400 hover:text-gray-600">
          Passer
        </button>
      </header>

      {/* Contenu */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {STEPS[step].title && (
            <motion.h1 key={step} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                       className="text-3xl font-bold text-gray-900 text-center mb-8">
              {STEPS[step].title}
            </motion.h1>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={step}
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              <StepComponent
                answers={answers}
                onAnswer={handleAnswer}
                onNext={handleNext}
                user={user}
                saving={saving}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

// ─── Étape 1 : Welcome ──────────────────────────────────────────
function WelcomeStep({ user, onNext }) {
  const icons = ['📸', '📘', '🐦', '💼', '🎵', '▶️', '📌', '🦋', '🧵', '✨', '🌟', '💫']
  return (
    <div className="text-center">
      <div className="relative h-48 mb-8 overflow-hidden rounded-2xl">
        {icons.map((icon, i) => (
          <motion.span key={i} className="absolute text-2xl opacity-20"
                       style={{ left: `${8 + (i * 7.5)}%`, top: `${15 + (i % 4) * 20}%` }}
                       animate={{ y: [0, -8, 0] }}
                       transition={{ duration: 2 + i * 0.2, repeat: Infinity }}>
            {icon}
          </motion.span>
        ))}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            Hey {user?.first_name} 👋<br />
            Bienvenue sur Social Mind AI
          </h1>
        </div>
      </div>
      <button onClick={onNext}
              className="inline-flex items-center gap-2 bg-green-400 hover:bg-green-500 text-white px-8 py-3 rounded-full text-base font-medium transition-colors">
        Commencer <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─── Étape 2 : Profil ──────────────────────────────────────────
function ProfileStep({ answers, onAnswer }) {
  const options = [
    { value: 'content_creator',  label: 'Créateur de contenu', emoji: '🎨' },
    { value: 'influencer',       label: 'Influenceur',          emoji: '⭐' },
    { value: 'freelancer',       label: 'Freelancer',           emoji: '💻' },
    { value: 'small_business',   label: 'Petite entreprise',    emoji: '🏪' },
    { value: 'personal_brand',   label: 'Personal Brand',       emoji: '👤' },
    { value: 'coach',            label: 'Coach',                emoji: '🎯' },
    { value: 'other',            label: 'Autre',                emoji: '🌟' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map(({ value, label, emoji }) => (
        <button key={value} onClick={() => onAnswer('profile', value)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all',
                  answers.profile === value ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
                )}>
          <span className="text-2xl bg-gray-100 rounded-xl p-2">{emoji}</span>
          <span className="text-sm font-medium text-gray-900">{label}</span>
          {answers.profile === value && <Check className="h-4 w-4 text-green-500 ml-auto" />}
        </button>
      ))}
    </div>
  )
}

// ─── Étape 3 : Réseaux ─────────────────────────────────────────
function NetworksStep({ answers, onAnswer }) {
  const networks = [
    { value: 'instagram', label: 'Instagram', emoji: '📸', color: 'bg-pink-50' },
    { value: 'tiktok',    label: 'TikTok',    emoji: '🎵', color: 'bg-gray-50' },
    { value: 'facebook',  label: 'Facebook',  emoji: '📘', color: 'bg-blue-50' },
    { value: 'linkedin',  label: 'LinkedIn',  emoji: '💼', color: 'bg-blue-50' },
    { value: 'twitter',   label: 'Twitter/X', emoji: '🐦', color: 'bg-sky-50'  },
    { value: 'pinterest', label: 'Pinterest', emoji: '📌', color: 'bg-red-50'  },
  ]
  const selected = answers.networks || []
  const toggle   = (v) => onAnswer('networks', selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])

  return (
    <div className="grid grid-cols-3 gap-3">
      {networks.map(({ value, label, emoji, color }) => {
        const isSel = selected.includes(value)
        return (
          <button key={value} onClick={() => toggle(value)}
                  className={cn('relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                    isSel ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300')}>
            {isSel && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
            <span className={cn('text-3xl p-2 rounded-xl', color)}>{emoji}</span>
            <span className="text-xs font-medium text-gray-900">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Étape 4 : Objectif ────────────────────────────────────────
function GoalStep({ answers, onAnswer }) {
  const goals = [
    { value: 'grow_followers', label: 'Augmenter mes abonnés',    emoji: '📈' },
    { value: 'engagement',     label: 'Plus d\'engagement',       emoji: '❤️' },
    { value: 'sell',           label: 'Vendre mes produits',      emoji: '🛒' },
    { value: 'personal_brand', label: 'Construire mon image',     emoji: '🌟' },
    { value: 'clients',        label: 'Trouver des clients',      emoji: '🤝' },
    { value: 'visibility',     label: 'Promouvoir mon activité',  emoji: '📣' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {goals.map(({ value, label, emoji }) => (
        <button key={value} onClick={() => onAnswer('goal', value)}
                className={cn('flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all',
                  answers.goal === value ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-gray-300')}>
          <span className="text-2xl">{emoji}</span>
          <span className="text-sm font-medium text-gray-900">{label}</span>
          {answers.goal === value && <Check className="h-4 w-4 text-violet-500 ml-auto" />}
        </button>
      ))}
    </div>
  )
}

// ─── Étape 5 : Fréquence ───────────────────────────────────────
function FrequencyStep({ answers, onAnswer }) {
  const options = [
    { value: 'never',    label: 'Jamais',      sub: 'Je veux commencer' },
    { value: '1-2/week', label: '1-2/semaine', sub: 'Débutant' },
    { value: '3-5/week', label: '3-5/semaine', sub: 'Régulier' },
    { value: 'daily',    label: 'Tous les jours', sub: 'Très actif' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
      {options.map(({ value, label, sub }) => (
        <button key={value} onClick={() => onAnswer('frequency', value)}
                className={cn('p-5 rounded-2xl border-2 text-center transition-all',
                  answers.frequency === value ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300')}>
          <p className="text-base font-bold text-gray-900">{label}</p>
          <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </button>
      ))}
    </div>
  )
}

// ─── Étape 6 : Nombre de comptes ───────────────────────────────
function AccountsStep({ answers, onAnswer }) {
  const options = [
    { value: '1',            label: '1 compte',          showAlert: false },
    { value: '2',            label: '2 comptes',         showAlert: false },
    { value: 'more_than_2',  label: 'Plus de 2',         showAlert: true  },
  ]
  return (
    <div className="space-y-4 max-w-md mx-auto">
      {options.map(({ value, label, showAlert }) => (
        <div key={value}>
          <button onClick={() => onAnswer('accounts', value)}
                  className={cn('w-full p-4 rounded-2xl border-2 text-center font-medium transition-all',
                    answers.accounts === value ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-200 bg-white hover:border-gray-300 text-gray-900')}>
            {label}
          </button>
          {showAlert && answers.accounts === value && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 p-4 bg-violet-50 border border-violet-200 rounded-xl text-sm text-violet-700">
              💡 Avec plus de 2 comptes, notre <strong>Plan Professionnel Agence</strong> est fait pour vous !
              Il inclut des outils avancés pour gérer plusieurs clients.
            </motion.div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Étape 7 : Catégories ──────────────────────────────────────
function CategoriesStep({ answers, onAnswer }) {
  const categories = [
    '✈️ Voyage', '👗 Mode', '🍕 Cuisine', '📚 Éducation',
    '💼 Business', '💻 Technologie', '💪 Fitness', '💄 Beauté',
    '💰 Finance', '🎮 Gaming', '🌿 Lifestyle', '🎨 Autre',
  ]
  const selected = answers.categories || []
  const toggle   = (c) => onAnswer('categories', selected.includes(c) ? selected.filter(x => x !== c) : [...selected, c])

  return (
    <div className="grid grid-cols-3 gap-2">
      {categories.map((cat) => {
        const isSel = selected.includes(cat)
        return (
          <button key={cat} onClick={() => toggle(cat)}
                  className={cn('p-3 rounded-xl border-2 text-sm font-medium transition-all',
                    isSel ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700')}>
            {cat}
          </button>
        )
      })}
    </div>
  )
}

// ─── Étape 8 : Voix de marque ───────────────────────────────────
function VoiceStep({ answers, onAnswer, onNext, saving }) {
  return (
    <div className="space-y-4">
      <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-sm text-violet-700">
        <p className="font-medium mb-1">💡 Pourquoi c'est important ?</p>
        <p>L'IA analysera votre style d'écriture pour générer du contenu qui ressemble vraiment à vous. Collez 1 à 3 exemples de vos publications passées.</p>
      </div>

      {[
        ['voice1', 'Publication exemple 1 (copiez-collez un de vos posts...)'],
        ['voice2', 'Publication exemple 2 (optionnel)...'],
        ['voice3', 'Publication exemple 3 (optionnel)...'],
      ].map(([key, placeholder]) => (
        <textarea key={key} rows={3}
                  value={answers[key] || ''}
                  onChange={(e) => onAnswer(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
      ))}

      <div className="flex gap-3 pt-2">
        <button onClick={onNext} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-green-400 hover:bg-green-500 text-white px-6 py-3 rounded-full font-medium transition-colors disabled:opacity-50">
          {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sauvegarde...</> : <>Terminer <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>

      <p className="text-xs text-center text-gray-400">Vous pourrez modifier ces exemples à tout moment dans les Paramètres.</p>
    </div>
  )
}

// ─── Mapping des composants ─────────────────────────────────────
const STEP_COMPONENTS = {
  welcome   : WelcomeStep,
  profile   : ProfileStep,
  networks  : NetworksStep,
  goal      : GoalStep,
  frequency : FrequencyStep,
  accounts  : AccountsStep,
  categories: CategoriesStep,
  voice     : VoiceStep,
}