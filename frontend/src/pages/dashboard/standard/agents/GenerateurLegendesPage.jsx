// frontend/src/pages/dashboard/standard/agents/GenerateurLegendesPage.jsx
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { GeneratorForm  } from '@/components/generator/GeneratorForm'
import { CaptionVariants } from '@/components/generator/CaptionVariants'
import { MediaPreview   } from '@/components/generator/MediaPreview'
import { PublishSection  } from '@/components/generator/PublishSection'
import { useGenerateContent } from '@/hooks/useContent'

const STEPS = [
  { id: 'form',    label: '1. Créer',   icon: '✍️' },
  { id: 'results', label: '2. Choisir', icon: '📋' },
  { id: 'publish', label: '3. Publier', icon: '🚀' },
]

const cn = (...c) => c.filter(Boolean).join(' ')

export default function GenerateurLegendesPage() {
  const navigate         = useNavigate()
  const generateMutation = useGenerateContent()

  const [step,            setStep]           = useState('form')
  const [contentId,       setContentId]      = useState(null)
  const [variants,        setVariants]       = useState([])
  const [imageUrl,        setImageUrl]       = useState(null)
  const [videoUrl,        setVideoUrl]       = useState(null)
  const [brandInfo,       setBrandInfo]      = useState(null)
  const [selectedVariant, setSelectedVariant]= useState(null)
  const [platform,        setPlatformState]  = useState('instagram')

  const handleGenerate = (formData) => {
    setPlatformState(formData.platform)
    generateMutation.mutate(formData, {
      onSuccess: (response) => {
        const data = response.data
        setContentId(data.content_id)
        setVariants(data.variants || [])
        setImageUrl(data.image_url || null)
        setVideoUrl(data.video_url || null)
        setBrandInfo(data.brand_voice_info)
        setSelectedVariant(null)
        setStep('results')
        toast.success('✅ 3 légendes générées !')
      },
    })
  }

  const handleGoToPublish = () => {
    if (!selectedVariant) {
      toast.error('Sélectionnez d\'abord une variante de légende.')
      return
    }
    setStep('publish')
  }

  const handlePublishSuccess = () => {
    toast.success('✅ Publié avec succès !')
    setStep('form')
    setContentId(null)
    setVariants([])
    setImageUrl(null)
    setVideoUrl(null)
    setSelectedVariant(null)
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4]">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/agents')}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              ✍️ Générateur de Légendes IA
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                Mistral 7B · SDXL-Turbo · ModelScope T2V
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              3 variantes adaptées à votre plateforme + image et vidéo IA
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap',
                step === s.id ? 'bg-indigo-600 text-white' :
                (step === 'results' && i === 0) || (step === 'publish' && i < 2)
                  ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              )}>
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </div>
              {i < 2 && <div className="flex-1 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* ── Étape 1 : Formulaire ── */}
        {step === 'form' && (
          <GeneratorForm
            onSubmit={handleGenerate}
            isLoading={generateMutation.isPending}
          />
        )}

        {/* ── Étape 2 : Résultats ── */}
        {step === 'results' && (
          <div className="space-y-6">
            {/* Info brand voice */}
            {brandInfo && brandInfo.n_examples > 0 && (
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700">
                🎨 <strong>Voix de marque analysée</strong> — Ton détecté :
                <span className="font-bold ml-1">{brandInfo.dominant_tone}</span>
                <span className="ml-2 text-indigo-400">({brandInfo.n_examples} exemple(s) analysés)</span>
              </div>
            )}

            {/* Légendes + Médias */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CaptionVariants
                variants={variants}
                selectedId={selectedVariant}
                onSelect={setSelectedVariant}
              />
              <MediaPreview
                imageUrl={imageUrl}
                videoUrl={videoUrl}
                contentId={contentId}
                platform={platform}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-center pt-2">
              <button
                onClick={() => setStep('form')}
                className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                ← Régénérer
              </button>
              <button
                onClick={handleGoToPublish}
                disabled={!selectedVariant}
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                🚀 Publier la Variante {selectedVariant} →
              </button>
            </div>
          </div>
        )}

        {/* ── Étape 3 : Publication ── */}
        {step === 'publish' && (
          <PublishSection
            contentId={contentId}
            selectedVariant={selectedVariant}
            variants={variants}
            imageUrl={imageUrl}
            videoUrl={videoUrl}
            onSuccess={handlePublishSuccess}
            onBack={() => setStep('results')}
          />
        )}
      </div>
    </div>
  )
}