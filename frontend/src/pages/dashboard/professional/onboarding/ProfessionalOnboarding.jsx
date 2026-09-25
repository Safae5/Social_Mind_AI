// frontend/src/pages/dashboard/professional/onboarding/ProfessionalOnboarding.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { professionalApi } from '@/api/professionalApi'
import { Step1Professional } from './steps/Step1Professional'
import { Step2Expertise    } from './steps/Step2Expertise'
import { Step3Niches       } from './steps/Step3Niches'
import { Step4Performance  } from './steps/Step4Performance'
import { Step5Services     } from './steps/Step5Services'
import { Step6Agents       } from './steps/Step6Agents'
import { Step7Objectives   } from './steps/Step7Objectives'

const STEPS = [
  { id: 1, label: 'Informations professionnelles', icon: '🏢' },
  { id: 2, label: 'Expertise marketing',           icon: '🎯' },
  { id: 3, label: 'Niches spécialisées',           icon: '🌍' },
  { id: 4, label: 'Performance',                   icon: '📊' },
  { id: 5, label: 'Services proposés',             icon: '⚡' },
  { id: 6, label: 'Configuration IA',              icon: '🤖' },
  { id: 7, label: 'Objectifs',                     icon: '🚀' },
]

export default function ProfessionalOnboarding() {
  const navigate      = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading,   setIsLoading]   = useState(true)
  const [isSaving,    setIsSaving]    = useState(false)
  const [profile,     setProfile]     = useState(null)

  useEffect(() => {
    professionalApi.getOnboardingStatus()
      .then(r => {
        const data = r.data.data
        setProfile(data.profile)
        if (data.onboarding_completed) {
          navigate('/dashboard/professional')
        } else {
          setCurrentStep(data.current_step || 1)
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const handleSaveStep = async (stepData) => {
    setIsSaving(true)
    try {
      const r = await professionalApi.saveOnboardingStep(currentStep, stepData)
      setProfile(r.data.data.profile)
      if (currentStep < 7) {
        setCurrentStep(currentStep + 1)
      } else {
        toast.success('✅ Profil professionnel configuré !')
        navigate('/dashboard/professional')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de sauvegarde.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Chargement de votre profil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 text-sm mb-6">
            <span>🏢</span>
            <span>Configuration Professionnelle — Social Mind AI</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Configurez votre espace professionnel
          </h1>
          <p className="text-white/60">
            7 étapes pour activer vos 7 agents IA et gérer vos clients
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-10 overflow-x-auto pb-2">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  step.id === currentStep
                    ? 'bg-indigo-600 border-indigo-400 text-white scale-110'
                    : step.id < currentStep
                    ? 'bg-green-600 border-green-400 text-white'
                    : 'bg-white/5 border-white/20 text-white/40'
                }`}>
                  {step.id < currentStep ? '✓' : step.icon}
                </div>
                <span className={`text-xs mt-1 whitespace-nowrap hidden md:block ${
                  step.id === currentStep ? 'text-indigo-300' : 'text-white/30'
                }`}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`h-0.5 w-8 md:w-16 mx-1 flex-shrink-0 ${
                  step.id < currentStep ? 'bg-green-500' : 'bg-white/10'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Contenu de l'étape */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0  }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              {currentStep === 1 && <Step1Professional onNext={handleSaveStep} isSaving={isSaving} initialData={profile} />}
              {currentStep === 2 && <Step2Expertise    onNext={handleSaveStep} isSaving={isSaving} initialData={profile} />}
              {currentStep === 3 && <Step3Niches       onNext={handleSaveStep} isSaving={isSaving} initialData={profile} />}
              {currentStep === 4 && <Step4Performance  onNext={handleSaveStep} isSaving={isSaving} initialData={profile} />}
              {currentStep === 5 && <Step5Services     onNext={handleSaveStep} isSaving={isSaving} initialData={profile} />}
              {currentStep === 6 && <Step6Agents       onNext={handleSaveStep} isSaving={isSaving} initialData={profile} />}
              {currentStep === 7 && <Step7Objectives   onNext={handleSaveStep} isSaving={isSaving} initialData={profile} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation retour */}
        {currentStep > 1 && (
          <div className="text-center mt-4">
            <button
              onClick={() => setCurrentStep(s => s - 1)}
              className="text-white/40 hover:text-white/70 text-sm transition-colors"
            >
              ← Étape précédente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}