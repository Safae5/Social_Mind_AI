// frontend/src/components/generator/GeneratorForm.jsx
import { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram',  emoji: '📸', specs: 'Optimal 138-150 chars · 12 hashtags' },
  { id: 'tiktok',    label: 'TikTok',     emoji: '🎵', specs: '< 150 chars · #fyp · ultra court' },
  { id: 'facebook',  label: 'Facebook',   emoji: '👥', specs: '40-80 mots · 2 hashtags' },
  { id: 'linkedin',  label: 'LinkedIn',   emoji: '💼', specs: '150-300 mots · 3 hashtags pro' },
  { id: 'twitter',   label: 'Twitter/X',  emoji: '🐦', specs: '280 chars max · 1-2 hashtags' },
]

const TONES = [
  { id: 'decontracte',   label: 'Décontracté',  desc: 'Amical, accessible, conversationnel' },
  { id: 'professionnel', label: 'Professionnel', desc: 'Sérieux, expert, crédible' },
  { id: 'inspirant',     label: 'Inspirant',     desc: 'Motivant, émotionnel, aspirationnel' },
  { id: 'educatif',      label: 'Éducatif',      desc: 'Pédagogique, tips, conseils' },
  { id: 'humoristique',  label: 'Humoristique',  desc: 'Léger, drôle, relatable' },
  { id: 'premium',       label: 'Premium',       desc: 'Élégant, luxe, exclusif' },
  { id: 'urgent',        label: 'Urgent',        desc: 'FOMO, offres limitées, dynamique' },
  { id: 'communautaire', label: 'Communautaire', desc: 'Chaleureux, inclusif, ensemble' },
]

const cn = (...c) => c.filter(Boolean).join(' ')

export function GeneratorForm({ onSubmit, isLoading }) {
  const [subject,        setSubject]       = useState('')
  const [platform,       setPlatform]      = useState('instagram')
  const [tone,           setTone]          = useState('decontracte')
  const [language,       setLanguage]      = useState('Français')
  const [extraContext,   setExtraContext]  = useState('')
  const [brandEx1,       setBrandEx1]      = useState('')
  const [brandEx2,       setBrandEx2]      = useState('')
  const [brandEx3,       setBrandEx3]      = useState('')
  const [generateImage,  setGenerateImage] = useState(true)
  const [generateVideo,  setGenerateVideo] = useState(false)
  const [showBrandVoice, setShowBrandVoice]= useState(false)

  const selectedPlatform = PLATFORMS.find(p => p.id === platform)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!subject.trim()) return
    onSubmit({
      subject,
      platform,
      tone,
      language,
      extra_context   : extraContext,
      brand_example_1 : brandEx1,
      brand_example_2 : brandEx2,
      brand_example_3 : brandEx3,
      generate_image  : generateImage,
      generate_video  : generateVideo,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Sujet ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          ✍️ Sujet de votre publication <span className="text-red-500">*</span>
        </label>
        <textarea
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Ex: Nouvelle collection de robes d'été, Mon conseil du lundi, Recette facile de pâtes carbonara..."
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          required
        />
        <p className="text-xs text-gray-400 mt-1">{subject.length}/500 caractères</p>
      </div>

      {/* ── Plateforme ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          📱 Plateforme cible
        </label>
        <div className="grid grid-cols-5 gap-2">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center',
                platform === p.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-100 hover:border-gray-200 bg-white'
              )}
            >
              <span className="text-2xl">{p.emoji}</span>
              <span className={cn('text-xs font-medium', platform === p.id ? 'text-indigo-700' : 'text-gray-600')}>
                {p.label}
              </span>
            </button>
          ))}
        </div>
        {selectedPlatform && (
          <p className="text-xs text-indigo-500 mt-2 text-center">
            ℹ️ {selectedPlatform.specs}
          </p>
        )}
      </div>

      {/* ── Ton ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          🎨 Ton de communication
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {TONES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTone(t.id)}
              className={cn(
                'p-3 rounded-xl border-2 text-left transition-all',
                tone === t.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-100 hover:border-gray-200 bg-white'
              )}
            >
              <p className={cn('text-xs font-semibold', tone === t.id ? 'text-indigo-700' : 'text-gray-700')}>
                {t.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Options ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">⚙️ Options</h3>

        {/* Langue */}
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-600 w-24">Langue :</label>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          >
            {['Français', 'English', 'العربية', 'Español', 'Italiano'].map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        {/* Contexte additionnel */}
        <div>
          <label className="text-sm text-gray-600 block mb-1">Contexte additionnel :</label>
          <input
            value={extraContext}
            onChange={e => setExtraContext(e.target.value)}
            placeholder="Ex: Soldes de 30%, collection limitée, lancement produit..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          />
        </div>

        {/* Génération IA */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={generateImage}
              onChange={e => setGenerateImage(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-600">
              🖼️ Générer une image <span className="text-xs text-gray-400">(SDXL-Turbo ~30s)</span>
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={generateVideo}
              onChange={e => setGenerateVideo(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-600">
              🎬 Générer une vidéo <span className="text-xs text-amber-500">(ModelScope T2V ~3-5min)</span>
            </span>
          </label>
        </div>
      </div>

      {/* ── Brand Voice (optionnel) ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowBrandVoice(!showBrandVoice)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div>
            <span className="text-sm font-semibold text-gray-700">
              🎯 Voix de marque personnalisée <span className="text-gray-400 font-normal">(optionnel)</span>
            </span>
            <p className="text-xs text-gray-400 mt-0.5">
              Collez vos publications passées pour que l'IA imite votre style unique
            </p>
          </div>
          {showBrandVoice
            ? <ChevronUp className="h-4 w-4 text-gray-400" />
            : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>

        {showBrandVoice && (
          <div className="px-6 pb-6 space-y-3 border-t border-gray-100 pt-4">
            {[
              [brandEx1, setBrandEx1, 'Exemple 1 — Collez une de vos publications passées...'],
              [brandEx2, setBrandEx2, 'Exemple 2 (optionnel)...'],
              [brandEx3, setBrandEx3, 'Exemple 3 (optionnel)...'],
            ].map(([val, setter, placeholder], i) => (
              <textarea
                key={i}
                value={val}
                onChange={e => setter(e.target.value)}
                placeholder={placeholder}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              />
            ))}
            <p className="text-xs text-indigo-500">
              ℹ️ Plus vous donnez d'exemples, plus l'IA reproduira fidèlement votre style.
            </p>
          </div>
        )}
      </div>

      {/* ── Bouton Générer ── */}
      <button
        type="submit"
        disabled={isLoading || !subject.trim()}
        className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Génération en cours...
            {generateVideo && <span className="text-sm font-normal opacity-80">(vidéo ~3-5min)</span>}
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            Générer avec l'IA — Mistral 7B
          </>
        )}
      </button>
    </form>
  )
}