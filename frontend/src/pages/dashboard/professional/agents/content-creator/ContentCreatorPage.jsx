// ContentCreatorPage.jsx
// Agent Créateur de Contenu IA — Dashboard Professionnel Social Mind AI
// Mistral 7B (légendes + scripts) · SDXL-Turbo (visuels 1024×1024)
// ReportLab (PDF) · Meta Graph API v21 (publication)
// Workflow : Créer → Prévisualiser → Approuver & Publier

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Trash2, RefreshCw, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { contentCreatorApi } from '@/api/contentCreatorApi'

// ── Configuration plateformes ──────────────────────────────────
const PLATFORMS = [
  { id: 'instagram', emoji: '📸', label: 'Instagram', specs: 'Optimal 138-150 chars · 12 hashtags' },
  { id: 'tiktok',    emoji: '🎵', label: 'TikTok',    specs: '< 150 chars · #fyp · ultra court'    },
  { id: 'facebook',  emoji: '👥', label: 'Facebook',  specs: '40-80 mots · 2 hashtags'             },
  { id: 'linkedin',  emoji: '💼', label: 'LinkedIn',  specs: '150-300 mots · 3 hashtags pro'       },
  { id: 'twitter',   emoji: '🐦', label: 'Twitter/X', specs: '280 chars max · 1-2 hashtags'        },
]

const TONES = [
  { id: 'professionnel', label: 'Professionnel', desc: 'Sérieux, expert, crédible'         },
  { id: 'decontracte',   label: 'Décontracté',   desc: 'Amical, accessible, conversationnel'},
  { id: 'inspirant',     label: 'Inspirant',     desc: 'Motivant, émotionnel, aspirationnel' },
  { id: 'educatif',      label: 'Éducatif',      desc: 'Pédagogique, tips, conseils'        },
  { id: 'humoristique',  label: 'Humoristique',  desc: 'Léger, drôle, relatable'           },
  { id: 'premium',       label: 'Premium',       desc: 'Élégant, luxe, exclusif'            },
  { id: 'urgent',        label: 'Urgent',        desc: 'FOMO, offres limitées'              },
  { id: 'communautaire', label: 'Communautaire', desc: 'Chaleureux, inclusif'              },
]

const SCRIPT_COLORS = {
  'HOOK'      : 'border-l-red-400 bg-red-400/10',
  'PROBLÈME'  : 'border-l-orange-400 bg-orange-400/10',
  'SOLUTION'  : 'border-l-green-400 bg-green-400/10',
  'PREUVE'    : 'border-l-blue-400 bg-blue-400/10',
  'CTA'       : 'border-l-purple-400 bg-purple-400/10',
}

const STATUS_CONFIG = {
  pending  : { label: '⏳ En attente',       color: 'bg-amber-400/10 text-amber-400'  },
  approved : { label: '✅ Approuvé',         color: 'bg-blue-400/10 text-blue-400'    },
  published: { label: '🚀 Publié',           color: 'bg-green-400/10 text-green-400'  },
  failed   : { label: '❌ Échec publication', color: 'bg-red-400/10 text-red-400'     },
  rejected : { label: '✗ Rejeté',           color: 'bg-white/10 text-white/40'       },
}

// Étapes du pipeline pour l'affichage progression
const PIPELINE_STEPS = [
  '✍️ Génération de la légende (Mistral 7B)...',
  '🎨 Génération du visuel (SDXL-Turbo 1024×1024)...',
  '🎬 Génération du script vidéo (Mistral 7B)...',
  '📄 Génération du PDF pack complet (ReportLab)...',
]

const STEPS = [
  { id: 'form',    label: '1. Créer',               icon: '✍️' },
  { id: 'preview', label: '2. Prévisualiser',        icon: '📦' },
  { id: 'publish', label: '3. Approuver & Publier',  icon: '🚀' },
]

const cn = (...c) => c.filter(Boolean).join(' ')

// ══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function ContentCreatorPage({ client }) {
  const [step,       setStep]      = useState('form')
  const [packId,     setPackId]    = useState(null)
  const [packData,   setPackData]  = useState(null)
  const [isLoading,  setIsLoading] = useState(false)
  const [progress,   setProgress]  = useState('')
  const [packs,      setPacks]     = useState([])
  const [showHistory,setShowHistory]=useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      const r = await contentCreatorApi.getAll({ client_id: client?.id })
      setPacks(r.data.data?.packs || [])
    } catch {}
    finally { setIsLoadingHistory(false) }
  }, [client?.id])

  useEffect(() => {
    if (showHistory) loadHistory()
  }, [showHistory, loadHistory])

  // ── Génération du pack ────────────────────────────────────
  const handleGenerate = async (formData) => {
    setIsLoading(true)
    setProgress(PIPELINE_STEPS[0])
    let stepIdx = 0

    const stepTimer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, PIPELINE_STEPS.length - 1)
      setProgress(PIPELINE_STEPS[stepIdx])
    }, 5000)

    try {
      const r = await contentCreatorApi.generate({
        ...formData,
        client_id       : client?.id,
        client_name     : formData.client_name     || client?.name   || '',
        client_niche    : formData.client_niche    || client?.niche  || '',
        client_audience : formData.client_audience || client?.audience || '',
      })

      clearInterval(stepTimer)
      setPackId(r.data.pack_id)
      setPackData(r.data)
      setStep('preview')
      toast.success('✅ Pack de contenu généré — vérifiez avant approbation !')

    } catch (err) {
      clearInterval(stepTimer)
      toast.error(err.response?.data?.message || 'Erreur lors de la génération.')
    } finally {
      setIsLoading(false)
      setProgress('')
    }
  }

  // ── Approbation + Publication ─────────────────────────────
  const handleApproveAndPublish = async ({ smAccountId }) => {
    try {
      await contentCreatorApi.approve(packId)
      const r = await contentCreatorApi.publish(packId, smAccountId)
      toast.success(r.data.message)
      setStep('form')
      setPackData(null)
      setPackId(null)
      if (showHistory) loadHistory()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de publication.')
    }
  }

  // ── Rejet ─────────────────────────────────────────────────
  const handleReject = async (reason = 'Contenu rejeté') => {
    try {
      if (packId) await contentCreatorApi.reject(packId, reason)
      toast.success('Pack rejeté.')
      setStep('form')
      setPackData(null)
      setPackId(null)
    } catch {
      toast.error('Erreur.')
    }
  }

  return (
    <div className="space-y-6">

      {/* ── En-tête Agent ── */}
      <div className="bg-gradient-to-r from-pink-900/40 to-purple-900/40 border border-pink-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">✨</span>
          <div>
            <h2 className="text-xl font-bold text-white">Agent Créateur de Contenu IA</h2>
            <div className="flex flex-wrap gap-2 mt-1">
              {[
                { label: 'Mistral-7B (légende + script)', color: 'bg-purple-500/20 text-purple-300' },
                { label: 'SDXL-Turbo (visuel 1024×1024)', color: 'bg-pink-500/20 text-pink-300'    },
                { label: 'ReportLab (PDF)',                color: 'bg-amber-500/20 text-amber-300'  },
                { label: 'Meta Graph API v21',             color: 'bg-blue-500/20 text-blue-300'    },
              ].map(m => (
                <span key={m.label} className={`text-[10px] px-2 py-0.5 rounded-full font-mono border border-white/10 ${m.color}`}>
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">
          Sélectionnez un client + plateforme + sujet + ton →
          Mistral 7B génère la légende → SDXL-Turbo génère le visuel 1024×1024 →
          Mistral 7B génère le script vidéo → ReportLab génère le PDF →
          Approbation obligatoire avant publication Meta Graph API v21.
        </p>
      </div>

      {/* ── Stepper ── */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
              step === s.id
                ? 'bg-pink-600 text-white'
                : (step === 'preview' && i < 1) || (step === 'publish' && i < 2)
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-white/5 text-white/30'
            )}>
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </div>
            {i < 2 && <div className="flex-1 h-px bg-white/10" />}
          </div>
        ))}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="ml-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-full text-xs transition-colors"
        >
          📋 {showHistory ? 'Fermer' : 'Historique'}
        </button>
      </div>

      {/* ── Barre de progression ── */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-pink-500/10 border border-pink-500/20 rounded-2xl p-4"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-5 h-5 border-2 border-pink-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <p className="text-sm text-pink-300 font-medium">{progress}</p>
            </div>
            <p className="text-xs text-pink-300/50">
              Génération complète : 1-3 minutes (Mistral 7B + SDXL-Turbo + ReportLab)
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Historique ── */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <HistoryView
              packs={packs}
              isLoading={isLoadingHistory}
              onRefresh={loadHistory}
              onDelete={async (id) => {
                try {
                  await contentCreatorApi.destroy(id)
                  setPacks(prev => prev.filter(p => p.id !== id))
                  toast.success('Pack supprimé.')
                } catch { toast.error('Erreur.') }
              }}
              onDownloadPdf={async (pack) => {
                try {
                  const r   = await contentCreatorApi.downloadPdf(pack.id)
                  const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
                  const a   = document.createElement('a')
                  a.href     = url
                  a.download = `pack_contenu_${pack.client_name}_${pack.platform}.pdf`
                  a.click()
                  window.URL.revokeObjectURL(url)
                  toast.success('📥 PDF téléchargé !')
                } catch { toast.error('PDF non disponible.') }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Contenu par étape ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {step === 'form' && (
            <CreatorFormView
              onSubmit={handleGenerate}
              isLoading={isLoading}
              client={client}
            />
          )}
          {step === 'preview' && packData && (
            <PackPreviewView
              data={packData}
              packId={packId}
              onApprove={() => setStep('publish')}
              onReject={handleReject}
              onRegenerate={() => { setStep('form'); setPackData(null) }}
            />
          )}
          {step === 'publish' && packData && (
            <PublishApprovalView
              data={packData}
              packId={packId}
              onConfirm={handleApproveAndPublish}
              onBack={() => setStep('preview')}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ÉTAPE 1 — FORMULAIRE
// ══════════════════════════════════════════════════════════════
function CreatorFormView({ onSubmit, isLoading, client }) {
  const [platform,   setPlatform]   = useState('instagram')
  const [subject,    setSubject]    = useState('')
  const [tone,       setTone]       = useState('professionnel')
  const [language,   setLanguage]   = useState('Français')
  const [genImage,   setGenImage]   = useState(true)
  const [genScript,  setGenScript]  = useState(true)
  const [genPdf,     setGenPdf]     = useState(true)

  const handleSubmit = () => {
    if (!subject.trim()) { toast.error('Le sujet est requis.'); return }
    onSubmit({
      client_name       : client?.name     || 'Client',
      client_niche      : client?.niche    || '',
      client_audience   : client?.audience || '',
      client_brand_tone : tone,
      platform,
      subject           : subject.trim(),
      tone,
      language,
      generate_image    : genImage,
      generate_script   : genScript,
      generate_pdf      : genPdf,
    })
  }

  const selectedPlatform = PLATFORMS.find(p => p.id === platform)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Colonne principale */}
      <div className="lg:col-span-2 space-y-5">

        {/* Contexte client */}
        {client && (
          <div className="bg-[#1A1A2E] border border-pink-500/15 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center text-white font-bold">
                {client.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{client.name}</p>
                <p className="text-xs text-pink-300">{client.niche || 'Niche non renseignée'}</p>
              </div>
            </div>
            {client.audience && (
              <p className="text-xs text-white/40 mt-2">Audience : {client.audience}</p>
            )}
          </div>
        )}

        {/* Sujet */}
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">📌 Sujet du Contenu</h3>
          <textarea
            value={subject}
            onChange={e => setSubject(e.target.value)}
            rows={3}
            placeholder="Décrivez le sujet précis du post à créer...
ex: Lancement de la nouvelle collection printemps, Promotion -30% weekend, Tutoriel produit phare"
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:ring-2 focus:ring-pink-500 focus:outline-none resize-none"
          />
        </div>

        {/* Plateforme */}
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">📱 Plateforme Cible</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {PLATFORMS.map(p => (
              <button key={p.id} type="button" onClick={() => setPlatform(p.id)}
                className={cn(
                  'p-3 rounded-xl border-2 text-left transition-all',
                  platform === p.id
                    ? 'border-pink-500 bg-pink-500/15'
                    : 'border-white/10 bg-white/5 hover:border-white/25'
                )}>
                <div className="text-xl mb-1">{p.emoji}</div>
                <div className="text-xs font-semibold text-white">{p.label}</div>
                <div className="text-[10px] text-white/40 mt-0.5 leading-tight">{p.specs}</div>
              </button>
            ))}
          </div>
          {selectedPlatform && (
            <p className="text-[10px] text-pink-300/60 mt-2 text-center">
              {selectedPlatform.specs}
            </p>
          )}
        </div>

        {/* Ton */}
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">🎙️ Ton de Marque</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {TONES.map(t => (
              <button key={t.id} type="button" onClick={() => setTone(t.id)}
                className={cn(
                  'p-2.5 rounded-xl border text-left transition-all',
                  tone === t.id
                    ? 'border-pink-500 bg-pink-500/15'
                    : 'border-white/10 bg-white/5 hover:border-white/25'
                )}>
                <div className="text-xs font-semibold text-white">{t.label}</div>
                <div className="text-[10px] text-white/40 leading-tight">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Panneau droit — Options + Bouton */}
      <div className="space-y-5">

        {/* Options génération */}
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">⚙️ Éléments à générer</h3>

          <div>
            <label className="block text-xs text-white/50 mb-2">🌐 Langue</label>
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none mb-4">
              <option className="bg-slate-800">Français</option>
              <option className="bg-slate-800">English</option>
              <option className="bg-slate-800">Arabe (Darija)</option>
            </select>
          </div>

          <div className="space-y-2">
            {[
              { key: 'image',  state: genImage,  setter: setGenImage,  icon: '🎨', label: 'Visuel créatif', desc: 'SDXL-Turbo 1024×1024 · ~30-60s' },
              { key: 'script', state: genScript, setter: setGenScript, icon: '🎬', label: 'Script vidéo',   desc: 'Mistral 7B · 5 sections · ~15s' },
              { key: 'pdf',    state: genPdf,    setter: setGenPdf,    icon: '📄', label: 'PDF du pack',    desc: 'ReportLab complet · ~5s'       },
            ].map(item => (
              <button key={item.key} type="button"
                onClick={() => item.setter(!item.state)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-xl border transition-all',
                  item.state
                    ? 'border-pink-500/30 bg-pink-500/10'
                    : 'border-white/10 bg-white/5'
                )}>
                <div className="text-left">
                  <p className="text-xs font-medium text-white">{item.icon} {item.label}</p>
                  <p className="text-[10px] text-white/40">{item.desc}</p>
                </div>
                <div className={cn(
                  'relative w-10 h-5 rounded-full transition-colors flex-shrink-0',
                  item.state ? 'bg-pink-600' : 'bg-white/20'
                )}>
                  <div className={cn(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                    item.state ? 'translate-x-5' : 'translate-x-0.5'
                  )} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Récap modèles IA */}
        <div className="bg-white/3 border border-white/5 rounded-xl p-4 text-xs text-white/40 space-y-1.5">
          <p className="font-semibold text-white/60">🤖 Modèles IA</p>
          <p>• <strong className="text-white/60">Mistral 7B</strong> — Légende + Script</p>
          <p>• <strong className="text-white/60">SDXL-Turbo</strong> — Visuel 1024×1024</p>
          <p>• <strong className="text-white/60">ReportLab</strong> — PDF pack</p>
          <p className="text-green-400">✅ 100% gratuits — HuggingFace</p>
        </div>

        {/* Bouton génération */}
        <button
          onClick={handleSubmit}
          disabled={isLoading || !subject.trim()}
          className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-2xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>✨ GÉNÉRER LE PACK DE CONTENU</>
          )}
        </button>

        {/* Avertissement approbation */}
        <p className="text-[10px] text-white/30 text-center leading-relaxed">
          ⚠️ Approbation obligatoire avant publication. Aucune publication automatique.
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ÉTAPE 2 — PRÉVISUALISATION DU PACK
// ══════════════════════════════════════════════════════════════
function PackPreviewView({ data, packId, onApprove, onReject, onRegenerate }) {
  const [activeTab,   setActiveTab]  = useState('caption')
  const [copied,      setCopied]     = useState(false)
  const [downloading, setDownloading]= useState(null)

  const { caption, script, image_url, image_generation_failed, pdf_url } = data

  const TABS = [
    { id: 'caption', label: '✍️ Légende'   },
    { id: 'image',   label: '🎨 Visuel'    },
    { id: 'script',  label: '🎬 Script'    },
  ]

  const handleCopy = async () => {
    const text = `${caption?.caption || ''}\n\n${(caption?.hashtags || []).join(' ')}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Légende copiée !')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = async (type) => {
    setDownloading(type)
    try {
      const fn  = type === 'image' ? contentCreatorApi.downloadImage : contentCreatorApi.downloadPdf
      const r   = await fn(packId)
      const ext = type === 'image' ? 'png' : 'pdf'
      const url = window.URL.createObjectURL(new Blob([r.data]))
      const a   = document.createElement('a')
      a.href     = url
      a.download = `pack_contenu.${ext}`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success(`📥 ${type === 'image' ? 'Image' : 'PDF'} téléchargé !`)
    } catch { toast.error('Erreur téléchargement.') }
    finally { setDownloading(null) }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-white">📦 Pack de Contenu Généré</h2>
            <p className="text-xs text-white/40 mt-0.5">Vérifiez chaque élément avant approbation</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={onRegenerate}
              className="px-3 py-1.5 border border-white/10 text-white/50 rounded-xl text-xs hover:bg-white/5">
              🔄 Régénérer
            </button>
            <button onClick={() => onReject('Contenu rejeté')}
              className="px-3 py-1.5 border border-red-500/30 text-red-300 rounded-xl text-xs hover:bg-red-500/10">
              ❌ Rejeter
            </button>
            <button onClick={onApprove}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition-colors">
              ✅ Approuver → Publier
            </button>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-[#141420] border border-white/5 rounded-xl">
        <div className="flex">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-pink-500 text-white'
                  : 'border-transparent text-white/40 hover:text-white/70'
              )}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Légende Mistral 7B */}
      {activeTab === 'caption' && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Légende générée (Mistral 7B)</h3>
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-xl text-xs transition-colors">
              {copied ? <><Check className="h-3.5 w-3.5" /> Copié !</> : <><Copy className="h-3.5 w-3.5" /> Copier</>}
            </button>
          </div>

          <div className="bg-white/5 rounded-xl p-4 whitespace-pre-wrap text-sm text-white/80 leading-relaxed">
            {caption?.caption || 'Légende non disponible'}
          </div>

          <div className="flex flex-wrap gap-2">
            {(caption?.hashtags || []).map((tag, i) => (
              <span key={i}
                onClick={() => { navigator.clipboard.writeText(tag); toast.success(`${tag} copié !`) }}
                className="text-xs px-2.5 py-1 bg-pink-500/10 text-pink-300 rounded-full cursor-pointer hover:bg-pink-500/20 transition-colors">
                {tag}
              </span>
            ))}
          </div>

          {caption?.cta && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-purple-300 mb-1">🎯 CTA</p>
              <p className="text-sm text-white/80">{caption.cta}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Caractères', value: caption?.char_count || 0,                  color: 'text-pink-300'   },
              { label: 'Emojis',     value: caption?.emoji_count || 0,                 color: 'text-amber-300'  },
              { label: 'Hashtags',   value: (caption?.hashtags || []).length,          color: 'text-purple-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-xs text-white/40">{label}</p>
                <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visuel SDXL-Turbo */}
      {activeTab === 'image' && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Visuel créatif (SDXL-Turbo 1024×1024)</h3>
            {image_url && (
              <button onClick={() => handleDownload('image')}
                disabled={downloading === 'image'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600/20 text-pink-300 hover:bg-pink-600/30 rounded-xl text-xs transition-colors disabled:opacity-50">
                <Download className="h-3.5 w-3.5" />
                {downloading === 'image' ? 'Téléchargement...' : 'Télécharger PNG'}
              </button>
            )}
          </div>

          {image_url ? (
            <img src={image_url} alt="Visuel généré SDXL-Turbo"
              className="w-full rounded-2xl max-h-[500px] object-contain bg-black/20" />
          ) : image_generation_failed ? (
            <div className="h-64 bg-amber-500/5 border-2 border-dashed border-amber-500/20 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center px-6">
              <p className="text-amber-300 text-sm font-medium">⚠️ Échec de la génération du visuel</p>
              <p className="text-white/40 text-xs">SDXL-Turbo n'a pas répondu après plusieurs tentatives. Vous pouvez régénérer le pack ou l'approuver sans image.</p>
            </div>
          ) : (
            <div className="h-64 bg-white/5 rounded-2xl flex items-center justify-center text-white/20 border-2 border-dashed border-white/10 text-sm">
              Visuel non généré
            </div>
          )}

          {caption?.image_concept && (
            <p className="text-xs text-white/30 mt-3">
              <span className="font-medium text-white/50">Prompt SDXL-Turbo :</span> {caption.image_concept}
            </p>
          )}
        </div>
      )}

      {/* Script vidéo Mistral 7B */}
      {activeTab === 'script' && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Script vidéo (Mistral 7B)</h3>
              {script && (
                <p className="text-xs text-white/40 mt-0.5">
                  {script.title} · {script.total_duration}
                </p>
              )}
            </div>
            {pdf_url && (
              <button onClick={() => handleDownload('pdf')}
                disabled={downloading === 'pdf'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-xl text-xs transition-colors disabled:opacity-50">
                <Download className="h-3.5 w-3.5" />
                {downloading === 'pdf' ? 'Téléchargement...' : 'PDF complet'}
              </button>
            )}
          </div>

          {script ? (
            <>
              <div className="space-y-3">
                {(script.sections || []).map((section, i) => {
                  const colorClass = SCRIPT_COLORS[section.name] || 'border-l-white/20 bg-white/5'
                  return (
                    <div key={i} className={cn('border-l-4 rounded-r-xl p-4', colorClass)}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-white">{section.name}</span>
                        <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                          {section.timing}
                        </span>
                      </div>
                      <p className="text-sm text-white/80 mb-1">
                        <span className="font-medium text-white/50">🎙️ Voix :</span> {section.voiceover}
                      </p>
                      <p className="text-xs text-white/50">
                        <span className="font-medium">📸 Visuel :</span> {section.visual}
                      </p>
                    </div>
                  )
                })}
              </div>

              {script.production_notes && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-xs text-amber-300">
                    <span className="font-semibold">📋 Notes de production :</span> {script.production_notes}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-white/20 text-sm">Script non généré</div>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ÉTAPE 3 — APPROBATION & PUBLICATION META GRAPH API v21
// ══════════════════════════════════════════════════════════════
const PUBLISHABLE_PLATFORMS = ['instagram', 'facebook']

function PublishApprovalView({ data, packId, onConfirm, onBack }) {
  const [allAccounts, setAllAccounts]= useState([])
  const [selectedAcc, setSelectedAcc]= useState('')
  const [confirmed,   setConfirmed]  = useState(false)
  const [publishing,  setPublishing] = useState(false)
  const [error,       setError]      = useState('')

  const { caption, image_url } = data
  const accounts = allAccounts.filter(a => PUBLISHABLE_PLATFORMS.includes(a.platform))
  const unsupportedAccounts = allAccounts.filter(a => !PUBLISHABLE_PLATFORMS.includes(a.platform))

  // Charge les sm_accounts (Agent 2) — scopés par user_id côté backend, pas
  // par client (SocialManagerController::accounts()), donc pas de garde sur
  // client?.id : elle bloquait ce fetch en vue "Tous les clients"
  // (selectedClient === null par défaut sur le dashboard), affichant "Aucun
  // compte connecté" même quand un compte l'était bel et bien.
  useEffect(() => {
    import('@/api/socialManagerApi').then(({ socialManagerApi }) => {
      socialManagerApi.getAccounts().then(r => {
        const accs = r.data.data?.accounts || []
        setAllAccounts(accs)
        const publishable = accs.filter(a => PUBLISHABLE_PLATFORMS.includes(a.platform))
        if (publishable.length === 1) setSelectedAcc(publishable[0].id.toString())
      }).catch(() => {})
    })
  }, [])

  const handlePublish = async () => {
    if (!confirmed || !selectedAcc) return
    setPublishing(true)
    setError('')
    try {
      await onConfirm({ smAccountId: parseInt(selectedAcc) })
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la publication.')
    } finally {
      setPublishing(false)
    }
  }

  const PLATFORM_EMOJIS = { instagram: '📸', facebook: '👥', tiktok: '🎵' }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">

      {/* Récap du contenu */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
        <h2 className="text-base font-bold text-white mb-4">🚀 Confirmation de Publication</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-xs font-semibold text-white/50 mb-2 uppercase">Légende finale</p>
            <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed line-clamp-6">
              {caption?.caption}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {(caption?.hashtags || []).slice(0, 6).map((tag, i) => (
                <span key={i} className="text-[10px] text-pink-300">{tag}</span>
              ))}
            </div>
          </div>

          {image_url ? (
            <img src={image_url} alt="Visuel"
              className="rounded-xl w-full h-48 object-cover" />
          ) : (
            <div className="h-48 bg-white/5 rounded-xl flex items-center justify-center text-white/20 text-sm">
              Aucun visuel
            </div>
          )}
        </div>
      </div>

      {/* Sélection compte social */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">
          📱 Compte de Publication (Meta Graph API v21)
        </h3>

        {accounts.length === 0 ? (
          unsupportedAccounts.length > 0 ? (
            <div className="text-center py-6 px-4 bg-amber-500/5 border border-amber-500/15 rounded-xl">
              <p className="text-amber-300 text-sm font-medium mb-1">
                ⚠️ Publication directe non disponible pour {unsupportedAccounts.map(a => a.platform).join(', ')}
              </p>
              <p className="text-white/40 text-xs">
                Seuls Instagram et Facebook sont supportés pour la publication automatique aujourd'hui.
                Connectez un compte Instagram ou Facebook via l'Agent Gestionnaire RS, ou téléchargez
                le pack pour le publier manuellement.
              </p>
            </div>
          ) : (
            <div className="text-center py-6 text-white/20 text-sm">
              Aucun compte Instagram/Facebook connecté via l'Agent Gestionnaire RS
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map(account => (
              <button key={account.id} type="button"
                onClick={() => setSelectedAcc(account.id.toString())}
                className={cn(
                  'flex items-center gap-3 p-4 border-2 rounded-xl transition-all text-left',
                  selectedAcc === account.id.toString()
                    ? 'border-pink-500 bg-pink-500/10'
                    : 'border-white/10 hover:border-white/25'
                )}>
                <span className="text-2xl">{PLATFORM_EMOJIS[account.platform] || '📱'}</span>
                <div>
                  <p className="text-sm font-semibold text-white capitalize">{account.platform}</p>
                  <p className="text-xs text-white/40">{account.account_name}</p>
                </div>
                {selectedAcc === account.id.toString() && (
                  <span className="ml-auto text-pink-400 text-xl">✓</span>
                )}
              </button>
            ))}
          </div>
        )}

        <p className="text-[10px] text-white/30 mt-3">
          Publication Instagram Business : 2 étapes (/{'{'}userId{'}'}/media → /{'{'}userId{'}'}/media_publish)
        </p>
      </div>

      {/* Avertissement approbation */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-amber-300 mb-2">
          ⚠️ Confirmation d'Approbation
        </h3>
        <p className="text-xs text-amber-300/70 mb-4 leading-relaxed">
          En publiant, vous confirmez avoir vérifié et approuvé l'ensemble du pack de contenu
          (légende, visuel, script) pour le compte de votre client. La publication sera
          immédiate via Meta Graph API v21 et ne pourra pas être annulée depuis Social Mind AI.
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded" />
          <span className="text-xs text-amber-300 font-medium">
            J'approuve ce contenu et j'autorise sa publication directe sur le compte client sélectionné.
          </span>
        </label>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button onClick={onBack}
          className="flex-1 py-3 border border-white/10 text-white/50 rounded-xl text-sm hover:bg-white/5">
          ← Retour au pack
        </button>
        <button
          onClick={handlePublish}
          disabled={publishing || !confirmed || !selectedAcc || accounts.length === 0}
          className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {publishing ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publication en cours...</>
          ) : (
            <>✅ Confirmer et Publier via Meta Graph API v21</>
          )}
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// HISTORIQUE DES PACKS
// ══════════════════════════════════════════════════════════════
function HistoryView({ packs, isLoading, onRefresh, onDelete, onDownloadPdf }) {
  return (
    <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white">📋 Historique des packs</h3>
        <button onClick={onRefresh} className="p-1.5 text-white/30 hover:text-white/70 rounded-lg">
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
        </div>
      ) : packs.length === 0 ? (
        <div className="text-center py-10 text-white/20">
          <div className="text-3xl mb-2">✨</div>
          <p className="text-sm">Aucun pack généré</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
          {packs.map(pack => {
            const statusCfg = STATUS_CONFIG[pack.publish_status] || STATUS_CONFIG.pending
            const PFEMOJI   = { instagram: '📸', tiktok: '🎵', facebook: '👥', linkedin: '💼', twitter: '🐦' }

            return (
              <div key={pack.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/2">
                {/* Image preview */}
                {pack.image_url ? (
                  <img src={pack.image_url} alt=""
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-lg flex-shrink-0">
                    {PFEMOJI[pack.platform] || '📱'}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{pack.client_name}</p>
                    <span className="text-[10px] capitalize text-white/40 flex-shrink-0">
                      {PFEMOJI[pack.platform]} {pack.platform}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 truncate">{pack.subject}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', statusCfg.color)}>
                      {statusCfg.label}
                    </span>
                    <span className="text-[10px] text-white/25">{pack.created_ago}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {pack.has_pdf && (
                    <button onClick={() => onDownloadPdf(pack)}
                      className="p-1.5 text-white/30 hover:text-amber-400 rounded-lg">
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={() => onDelete(pack.id)}
                    className="p-1.5 text-white/20 hover:text-red-400 rounded-lg">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}