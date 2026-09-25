// ContentStrategyPage.jsx
// Agent Stratège de Contenu — Dashboard Professionnel Social Mind AI
// BERTopic (paraphrase-multilingual-MiniLM-L12-v2) · LDA/Gensim · TF-IDF · KMeans
// Mistral 7B (mistralai/Mistral-7B-Instruct-v0.3) · spaCy fr_core_news_md · ReportLab
// Meta Graph API v21 · Playwright

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, RefreshCw, Trash2, Plus, X, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { contentStrategyApi } from '@/api/contentStrategyApi'

// ── Configuration ──────────────────────────────────────────────
const PLATFORMS_LIST = ['Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'Twitter/X']
const TONES_LIST     = [
  'professionnel et accessible',
  'jeune et dynamique',
  'premium et élégant',
  'décontracté et amical',
  'éducatif et expert',
]

const PILLAR_COLORS = [
  'border-blue-500/30 bg-blue-500/10 text-blue-300',
  'border-purple-500/30 bg-purple-500/10 text-purple-300',
  'border-green-500/30 bg-green-500/10 text-green-300',
  'border-amber-500/30 bg-amber-500/10 text-amber-300',
  'border-pink-500/30 bg-pink-500/10 text-pink-300',
]

const DAY_COLORS = {
  'Lundi'    : 'border-l-blue-400',
  'Mardi'    : 'border-l-indigo-400',
  'Mercredi' : 'border-l-purple-400',
  'Jeudi'    : 'border-l-pink-400',
  'Vendredi' : 'border-l-orange-400',
  'Samedi'   : 'border-l-green-400',
  'Dimanche' : 'border-l-teal-400',
}

const TYPE_COLORS = {
  'Reel'        : 'bg-red-400/20 text-red-300',
  'Carrousel'   : 'bg-blue-400/20 text-blue-300',
  'Story'       : 'bg-purple-400/20 text-purple-300',
  'Post'        : 'bg-white/10 text-white/50',
  'Article'     : 'bg-green-400/20 text-green-300',
  'Vidéo courte': 'bg-orange-400/20 text-orange-300',
  'Infographie' : 'bg-teal-400/20 text-teal-300',
}

const cn = (...c) => c.filter(Boolean).join(' ')

// ── Étapes du pipeline (affichage progression) ─────────────────
const PIPELINE_STEPS = [
  '📡 Collecte données Meta Graph API + Playwright...',
  '🔄 Prétraitement NLP (NLTK + spaCy fr_core_news_md)...',
  '🔍 BERTopic (paraphrase-multilingual-MiniLM-L12-v2) — clustering thèmes...',
  '🔍 LDA / Gensim — topics latents...',
  '🏷️ TF-IDF + KMeans — scoring hashtags + clustering piliers...',
  '🧠 Mistral 7B — génération stratégie narrative + calendrier 7 jours...',
  '📄 ReportLab — génération rapport PDF...',
]

// ══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function ContentStrategyPage({ client }) {
  const [activeTab,   setActiveTab]  = useState('form')
  const [strategies,  setStrategies] = useState([])
  const [currentData, setCurrentData]= useState(null)   // Résultat de la génération
  const [isLoading,   setIsLoading]  = useState(true)
  const [isGenerating,setIsGenerating]=useState(false)
  const [progress,    setProgress]   = useState('')

  const TABS = [
    { id: 'form',     label: '⚙️ Paramètres'   },
    { id: 'pillars',  label: '🏛️ Piliers'       },
    { id: 'calendar', label: '🗓️ Calendrier'    },
    { id: 'hashtags', label: '🏷️ Hashtags'      },
    { id: 'report',   label: '📄 Rapport PDF'   },
    { id: 'history',  label: '📋 Historique'    },
  ]

  const loadStrategies = useCallback(async () => {
    setIsLoading(true)
    try {
      const r = await contentStrategyApi.getAll({ client_id: client?.id })
      setStrategies(r.data.data?.strategies || [])
    } catch {}
    finally { setIsLoading(false) }
  }, [client?.id])

  useEffect(() => { loadStrategies() }, [loadStrategies])

  // ── Génération ────────────────────────────────────────────
  const handleGenerate = async (formData) => {
    setIsGenerating(true)
    setProgress(PIPELINE_STEPS[0])
    let stepIdx = 0

    const stepTimer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, PIPELINE_STEPS.length - 1)
      setProgress(PIPELINE_STEPS[stepIdx])
    }, 6000)

    try {
      const r = await contentStrategyApi.generate({
        ...formData,
        client_id: client?.id,
      })
      clearInterval(stepTimer)

      setCurrentData(r.data)
      setActiveTab('pillars')
      await loadStrategies()
      toast.success('✅ Stratégie de contenu générée avec succès !')

    } catch (err) {
      clearInterval(stepTimer)
      toast.error(err.response?.data?.message || 'Erreur lors de la génération.')
    } finally {
      setIsGenerating(false)
      setProgress('')
    }
  }

  // ── Chargement d'une stratégie existante ──────────────────
  const handleLoadStrategy = async (id) => {
    try {
      const r = await contentStrategyApi.getOne(id)
      // Adapter le format pour les composants
      setCurrentData({
        strategy_id: id,
        data        : {
          pillars  : r.data.data.pillars,
          strategy : {
            ...r.data.data.strategy,
            calendrier_7_jours: r.data.data.calendar,
          },
          hashtags : r.data.data.hashtags,
        },
      })
      setActiveTab('pillars')
      toast.success('Stratégie chargée !')
    } catch {
      toast.error('Erreur chargement.')
    }
  }

  // ── Suppression ───────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette stratégie ?')) return
    try {
      await contentStrategyApi.destroy(id)
      setStrategies(prev => prev.filter(s => s.id !== id))
      toast.success('Stratégie supprimée.')
    } catch { toast.error('Erreur.') }
  }

  // ── Téléchargement PDF ────────────────────────────────────
  const handleDownloadPdf = async (id, niche) => {
    try {
      const r   = await contentStrategyApi.downloadPdf(id)
      const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      const a   = document.createElement('a')
      a.href     = url
      a.download = `strategie_contenu_${niche}_${id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('📥 PDF téléchargé !')
    } catch { toast.error('PDF non disponible.') }
  }

  return (
    <div className="space-y-6">

      {/* ── En-tête Agent ── */}
      <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border border-purple-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">📊</span>
          <div>
            <h2 className="text-xl font-bold text-white">Agent Stratège de Contenu</h2>
            <div className="flex flex-wrap gap-2 mt-1">
              {[
                { label: 'paraphrase-MiniLM-L12-v2 (BERTopic)', color: 'bg-purple-500/20 text-purple-300' },
                { label: 'LDA / Gensim',                         color: 'bg-indigo-500/20 text-indigo-300' },
                { label: 'TF-IDF + KMeans',                      color: 'bg-blue-500/20 text-blue-300'    },
                { label: 'Mistral-7B (stratégie)',               color: 'bg-pink-500/20 text-pink-300'    },
                { label: 'spaCy fr_core_news_md',                color: 'bg-green-500/20 text-green-300'  },
                { label: 'Meta Graph API v21',                   color: 'bg-amber-500/20 text-amber-300'  },
              ].map(m => (
                <span key={m.label} className={`text-[10px] px-2 py-0.5 rounded-full font-mono border border-white/10 ${m.color}`}>
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">
          Analyse le contenu des concurrents (Meta Graph API v21 + Playwright) →
          BERTopic identifie les thèmes → LDA extrait les topics latents →
          TF-IDF + KMeans génère les hashtags par pilier →
          Mistral 7B génère la stratégie éditoriale + calendrier 7 jours.
        </p>
      </div>

      {/* ── Barre de progression ── */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <p className="text-sm text-purple-300 font-medium">{progress || '⏳ Initialisation...'}</p>
            </div>
            <p className="text-xs text-purple-300/50">
              Pipeline complet : 3-8 minutes (BERTopic + Mistral 7B)
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navigation onglets ── */}
      <div className="bg-[#141420] border border-white/5 rounded-xl">
        <div className="flex overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={['pillars', 'calendar', 'hashtags', 'report'].includes(tab.id) && !currentData}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                'disabled:opacity-30 disabled:cursor-not-allowed',
                activeTab === tab.id
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-white/40 hover:text-white/70'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu onglets ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'form'     && (
            <StrategyFormView
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              client={client}
            />
          )}
          {activeTab === 'pillars'  && currentData && (
            <PillarsView data={currentData} />
          )}
          {activeTab === 'calendar' && currentData && (
            <CalendarView data={currentData} />
          )}
          {activeTab === 'hashtags' && currentData && (
            <HashtagsView data={currentData} />
          )}
          {activeTab === 'report'   && currentData && (
            <ReportView
              data={currentData}
              onDownloadPdf={handleDownloadPdf}
            />
          )}
          {activeTab === 'history'  && (
            <HistoryView
              strategies={strategies}
              isLoading={isLoading}
              onLoad={handleLoadStrategy}
              onDelete={handleDelete}
              onDownloadPdf={handleDownloadPdf}
              onRefresh={loadStrategies}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 1 — FORMULAIRE PARAMÈTRES
// ══════════════════════════════════════════════════════════════
function StrategyFormView({ onGenerate, isGenerating, client }) {
  const [form, setForm] = useState({
    niche               : client?.niche || '',
    secteur             : '',
    audience            : '',
    objectifs           : '',
    plateformes         : ['Instagram', 'TikTok', 'Facebook'],
    ton                 : 'professionnel et accessible',
    meta_access_token   : '',
    competitor_page_ids : '',
    instagram_handles   : '',
    tiktok_hashtags     : '',
    n_topics            : 5,
    use_bertopic        : true,
  })

  const togglePlatform = (p) => {
    setForm(f => ({
      ...f,
      plateformes: f.plateformes.includes(p)
        ? f.plateformes.filter(x => x !== p)
        : [...f.plateformes, p],
    }))
  }

  const handleSubmit = () => {
    if (!form.niche.trim())    { toast.error('La niche est requise.'); return }
    if (!form.audience.trim()) { toast.error("L'audience est requise."); return }

    onGenerate({
      ...form,
      competitor_page_ids: form.competitor_page_ids
        .split(',').map(s => s.trim()).filter(Boolean),
      instagram_handles  : form.instagram_handles
        .split(',').map(s => s.trim().replace('@', '')).filter(Boolean),
      tiktok_hashtags    : form.tiktok_hashtags
        .split(',').map(s => s.trim().replace('#', '')).filter(Boolean),
      n_topics           : Number(form.n_topics),
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* Colonne 1 — Profil client */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">📋 Profil Client</h3>

        <div>
          <label className="block text-xs text-white/50 mb-1">🎯 Niche *</label>
          <input value={form.niche} onChange={e => setForm(f => ({...f, niche: e.target.value}))}
            placeholder="ex: Mode femme marocaine"
            className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/25 focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">🏭 Secteur</label>
          <input value={form.secteur} onChange={e => setForm(f => ({...f, secteur: e.target.value}))}
            placeholder="ex: E-commerce"
            className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">👥 Audience *</label>
          <input value={form.audience} onChange={e => setForm(f => ({...f, audience: e.target.value}))}
            placeholder="ex: Femmes 25-35 ans, urbaines, passionnées de mode"
            className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">📈 Objectifs</label>
          <textarea value={form.objectifs} onChange={e => setForm(f => ({...f, objectifs: e.target.value}))}
            placeholder="ex: Augmenter l'engagement de 30%, générer des leads qualifiés"
            rows={2}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm resize-none focus:outline-none"
          />
        </div>

        {/* Plateformes */}
        <div>
          <label className="block text-xs text-white/50 mb-2">📱 Plateformes cibles</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS_LIST.map(p => (
              <button key={p} type="button" onClick={() => togglePlatform(p)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium transition-colors',
                  form.plateformes.includes(p)
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                )}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Ton */}
        <div>
          <label className="block text-xs text-white/50 mb-1">🎙️ Ton de marque</label>
          <select value={form.ton} onChange={e => setForm(f => ({...f, ton: e.target.value}))}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
            {TONES_LIST.map(t => <option key={t} value={t} className="bg-slate-800">{t}</option>)}
          </select>
        </div>
      </div>

      {/* Colonne 2 — Sources de données + Config IA */}
      <div className="space-y-4">

        {/* Meta Graph API */}
        <div className="bg-[#1A1A2E] border border-blue-500/20 rounded-2xl p-5">
          <p className="text-xs font-semibold text-blue-300 mb-3">
            📡 Meta Graph API v21 (données temps réel)
          </p>
          <div className="space-y-2">
            <input
              type="password"
              value={form.meta_access_token}
              onChange={e => setForm(f => ({...f, meta_access_token: e.target.value}))}
              placeholder="Page Access Token Meta"
              className="w-full bg-white/5 border border-blue-500/20 rounded-lg px-3 py-2 text-white text-xs focus:outline-none placeholder-white/25"
            />
            <input
              value={form.competitor_page_ids}
              onChange={e => setForm(f => ({...f, competitor_page_ids: e.target.value}))}
              placeholder="IDs pages concurrentes (séparés par virgule)"
              className="w-full bg-white/5 border border-blue-500/20 rounded-lg px-3 py-2 text-white text-xs focus:outline-none placeholder-white/25"
            />
          </div>
          <p className="text-[10px] text-blue-300/40 mt-2">Limite : 200 appels/h · Insights 90 jours max</p>
        </div>

        {/* Playwright */}
        <div className="bg-[#1A1A2E] border border-purple-500/20 rounded-2xl p-5">
          <p className="text-xs font-semibold text-purple-300 mb-3">
            🕷️ Playwright Scraping (données complémentaires)
          </p>
          <div className="space-y-2">
            <input
              value={form.instagram_handles}
              onChange={e => setForm(f => ({...f, instagram_handles: e.target.value}))}
              placeholder="@handles Instagram (séparés par virgule)"
              className="w-full bg-white/5 border border-purple-500/20 rounded-lg px-3 py-2 text-white text-xs focus:outline-none placeholder-white/25"
            />
            <input
              value={form.tiktok_hashtags}
              onChange={e => setForm(f => ({...f, tiktok_hashtags: e.target.value}))}
              placeholder="Hashtags TikTok (séparés par virgule, sans #)"
              className="w-full bg-white/5 border border-purple-500/20 rounded-lg px-3 py-2 text-white text-xs focus:outline-none placeholder-white/25"
            />
          </div>
          <p className="text-[10px] text-purple-300/40 mt-2">
            Sans source configurée → corpus simulé selon la niche (80 posts)
          </p>
        </div>

        {/* Config IA */}
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <p className="text-xs font-semibold text-white/50 mb-3">🤖 Configuration IA</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Nombre de topics</label>
              <input type="number" min={3} max={8} value={form.n_topics}
                onChange={e => setForm(f => ({...f, n_topics: parseInt(e.target.value)}))}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">BERTopic activé</label>
              <button type="button"
                onClick={() => setForm(f => ({...f, use_bertopic: !f.use_bertopic}))}
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors mt-1',
                  form.use_bertopic ? 'bg-purple-600' : 'bg-white/20'
                )}>
                <div className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  form.use_bertopic ? 'translate-x-6' : 'translate-x-1'
                )} />
              </button>
              <p className="text-[10px] text-white/30 mt-1">
                {form.use_bertopic ? 'BERTopic + LDA' : 'LDA seulement (plus rapide)'}
              </p>
            </div>
          </div>
        </div>

        {/* Bouton génération */}
        <button
          onClick={handleSubmit}
          disabled={isGenerating || !form.niche.trim() || !form.audience.trim()}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Pipeline IA en cours (3-8 min)...
            </>
          ) : (
            <>✨ Générer la Stratégie de Contenu</>
          )}
        </button>

        {/* Pipeline info */}
        <div className="bg-white/2 border border-white/5 rounded-xl p-3">
          <p className="text-[10px] text-white/30 leading-relaxed">
            Pipeline : Meta Graph API + Playwright → NLTK + spaCy → BERTopic (MiniLM-L12-v2) → LDA/Gensim → TF-IDF + KMeans → Mistral 7B → ReportLab PDF
          </p>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 2 — PILIERS DE CONTENU (BERTopic + LDA)
// ══════════════════════════════════════════════════════════════
function PillarsView({ data }) {
  const pillars = data?.data?.pillars || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">🏛️ Piliers de Contenu</h3>
        <span className="text-xs text-white/40 bg-white/5 px-2.5 py-1 rounded-full">
          BERTopic (paraphrase-MiniLM-L12-v2) + LDA/Gensim
        </span>
      </div>

      {pillars.length === 0 ? (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-12 text-center text-white/20">
          <div className="text-4xl mb-3">🏛️</div>
          <p className="text-sm">Aucun pilier généré. Lancez une stratégie depuis l'onglet Paramètres.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pillars.map((pillar, idx) => {
            const colorClass = PILLAR_COLORS[idx % PILLAR_COLORS.length]
            return (
              <div key={pillar.id || idx}
                className={cn('border rounded-2xl p-4', colorClass)}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl font-bold opacity-60">#{pillar.id || idx + 1}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{pillar.nom}</p>
                    <span className="text-[10px] opacity-60">Source : {pillar.source || 'IA'}</span>
                  </div>
                </div>
                <p className="text-xs opacity-70 mb-3 leading-relaxed">{pillar.description}</p>
                <div className="flex flex-wrap gap-1">
                  {(pillar.mots_cles || []).slice(0, 8).map(word => (
                    <span key={word}
                      className="text-[10px] px-2 py-0.5 bg-white/10 rounded-full text-white/60">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 3 — CALENDRIER 7 JOURS (Mistral 7B)
// ══════════════════════════════════════════════════════════════
function CalendarView({ data }) {
  const strategy = data?.data?.strategy || {}
  const calendar = strategy.calendrier_7_jours || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">🗓️ Calendrier Hebdomadaire</h3>
        <span className="text-xs text-white/40 bg-white/5 px-2.5 py-1 rounded-full">
          Généré par Mistral 7B
        </span>
      </div>

      {/* Résumé stratégie */}
      {strategy.strategie_editoriale && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
          <p className="text-sm text-purple-200 leading-relaxed">{strategy.strategie_editoriale}</p>
          {strategy.tone_of_voice && (
            <p className="text-xs text-purple-300/60 mt-2">
              🎙️ Ton de voix : {strategy.tone_of_voice}
            </p>
          )}
        </div>
      )}

      {/* Calendrier */}
      {calendar.length === 0 ? (
        <div className="text-center py-8 text-white/20 text-sm">Calendrier non disponible.</div>
      ) : (
        <div className="space-y-3">
          {calendar.map((day, i) => (
            <div key={i}
              className={cn(
                'bg-[#1A1A2E] border border-white/5 border-l-4 rounded-r-2xl p-4',
                DAY_COLORS[day.jour] || 'border-l-white/20'
              )}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{day.jour}</span>
                  <span className="text-xs text-white/40">{day.plateforme}</span>
                </div>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-medium',
                  TYPE_COLORS[day.type_contenu] || 'bg-white/10 text-white/50'
                )}>
                  {day.type_contenu}
                </span>
              </div>

              <p className="text-sm font-medium text-white/90 mb-1">{day.sujet}</p>
              {day.angle && (
                <p className="text-xs text-white/40 mb-2">💡 {day.angle}</p>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-400 font-medium">{day.pilier}</span>
                <div className="flex flex-wrap gap-1">
                  {(day.hashtags || []).slice(0, 4).map(h => (
                    <span key={h} className="text-[10px] text-blue-400">
                      {h.startsWith('#') ? h : `#${h}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fréquence de publication */}
      {strategy.frequence_publication && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <p className="text-sm font-semibold text-white/70 mb-3">📊 Fréquence recommandée</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(strategy.frequence_publication).map(([plateform, freq]) => (
              <div key={plateform} className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-xs text-white/40">{plateform}</p>
                <p className="text-sm font-bold text-purple-300">{freq}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 4 — HASHTAGS (TF-IDF + KMeans)
// ══════════════════════════════════════════════════════════════
function HashtagsView({ data }) {
  const hashtags   = data?.data?.hashtags || {}
  const pillarSets = hashtags.pillar_sets || {}
  const topScored  = hashtags.top_scored  || []
  const [copied, setCopied] = useState('')

  const copyHashtags = (tags, pilier) => {
    const text = tags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ')
    navigator.clipboard.writeText(text)
    setCopied(pilier)
    setTimeout(() => setCopied(''), 2000)
    toast.success('Hashtags copiés !')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">🏷️ Hashtags Recommandés</h3>
        <span className="text-xs text-white/40 bg-white/5 px-2.5 py-1 rounded-full">
          TF-IDF + KMeans · Meta Graph API v21
        </span>
      </div>

      {/* Hashtags par pilier */}
      <div className="space-y-3">
        {Object.entries(pillarSets).map(([pilier, tags], idx) => (
          <div key={pilier}
            className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white">{pilier}</h4>
              <button onClick={() => copyHashtags(tags, pilier)}
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                {copied === pilier
                  ? <><Check className="h-3 w-3" /> Copié !</>
                  : <><Copy className="h-3 w-3" /> Copier</>
                }
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(tags || []).map((tag, i) => (
                <span key={i}
                  onClick={() => {
                    navigator.clipboard.writeText(tag.startsWith('#') ? tag : `#${tag}`)
                    toast.success(`${tag} copié !`)
                  }}
                  className={cn(
                    'text-xs px-3 py-1 rounded-full cursor-pointer transition-colors',
                    i < 3
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30 font-medium'
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  )}>
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Top hashtags TF-IDF */}
      {topScored.length > 0 && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <h4 className="text-sm font-semibold text-white/70 mb-4">
            📊 Top hashtags — Score TF-IDF
          </h4>
          <div className="space-y-2">
            {topScored.slice(0, 15).map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-white/30 w-6 text-right">{i + 1}</span>
                <span className="text-sm text-purple-300 font-medium w-36">{item.hashtag}</span>
                <div className="flex-1 bg-white/10 rounded-full h-1.5">
                  <div
                    className="bg-purple-500 h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, item.tfidf_score * 1000)}%` }}
                  />
                </div>
                <span className="text-xs text-white/30 w-16 text-right font-mono">
                  {item.tfidf_score.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(pillarSets).length === 0 && (
        <div className="text-center py-8 text-white/20 text-sm">Aucun hashtag disponible.</div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 5 — RAPPORT PDF
// ══════════════════════════════════════════════════════════════
function ReportView({ data, onDownloadPdf }) {
  const strategyId  = data?.strategy_id
  const strategy    = data?.data?.strategy || {}
  const pillars     = data?.data?.pillars  || []
  const dataInfo    = data?.data || {}

  return (
    <div className="space-y-5">
      {/* Bouton téléchargement PDF */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-6 text-center">
        <div className="w-20 h-20 bg-purple-500/10 border border-purple-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">📄</span>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Rapport Stratégie de Contenu</h3>
        <p className="text-sm text-white/40 mb-5">
          Piliers (BERTopic + LDA) · Calendrier 7j (Mistral 7B) · Hashtags (TF-IDF + KMeans) · Recommandations
        </p>

        {strategyId ? (
          <button onClick={() => onDownloadPdf(strategyId, strategy.niche || 'strategie')}
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl font-semibold transition-colors">
            <Download className="h-4 w-4" />
            Télécharger le PDF
          </button>
        ) : (
          <p className="text-white/30 text-sm">PDF en cours de génération...</p>
        )}
      </div>

      {/* Recommandations Mistral 7B */}
      {strategy.recommandations_cles?.length > 0 && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <h4 className="text-sm font-semibold text-white/70 mb-4">💡 Recommandations clés — Mistral 7B</h4>
          <div className="space-y-2">
            {strategy.recommandations_cles.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-white/3 rounded-xl">
                <span className="text-purple-400 flex-shrink-0 mt-0.5">•</span>
                <p className="text-sm text-white/70">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Récap pipeline */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Modèle NLP', value: 'BERTopic + LDA' },
          { label: 'Hashtags',   value: 'TF-IDF + KMeans' },
          { label: 'Stratégie', value: 'Mistral 7B' },
        ].map(item => (
          <div key={item.label} className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
            <p className="text-[10px] text-white/30">{item.label}</p>
            <p className="text-xs font-semibold text-purple-300 mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Sources données */}
      {dataInfo.data_sources && (
        <div className="bg-white/2 border border-white/5 rounded-xl p-3">
          <p className="text-xs text-white/30 mb-1">Sources des données :</p>
          <div className="flex gap-3">
            {Object.entries(dataInfo.data_sources).map(([key, used]) => (
              <span key={key} className={cn(
                'text-[10px] px-2 py-0.5 rounded-full',
                used ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/20'
              )}>
                {key === 'meta_api' ? 'Meta Graph API' :
                 key === 'playwright' ? 'Playwright' : 'Corpus simulé'} {used ? '✓' : '✗'}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 6 — HISTORIQUE
// ══════════════════════════════════════════════════════════════
function HistoryView({ strategies, isLoading, onLoad, onDelete, onDownloadPdf, onRefresh }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">📋 Stratégies générées</h3>
        <button onClick={onRefresh} className="p-2 text-white/30 hover:text-white/70 rounded-lg">
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : strategies.length === 0 ? (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-12 text-center text-white/20">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-sm">Aucune stratégie générée</p>
          <p className="text-xs mt-1">Lancez votre première analyse depuis l'onglet Paramètres</p>
        </div>
      ) : (
        <div className="space-y-3">
          {strategies.map(strategy => (
            <div key={strategy.id}
              className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-4 hover:border-purple-500/20 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-white truncate">{strategy.niche}</p>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full flex-shrink-0',
                      strategy.status === 'completed' ? 'bg-green-400/10 text-green-400' :
                      strategy.status === 'processing'? 'bg-amber-400/10 text-amber-400' :
                      strategy.status === 'failed'    ? 'bg-red-400/10 text-red-400'     :
                      'bg-white/10 text-white/40'
                    )}>
                      {strategy.status === 'completed' ? '✅ Complète' :
                       strategy.status === 'processing'? '⏳ En cours' :
                       strategy.status === 'failed'    ? '❌ Échouée'  : strategy.status}
                    </span>
                  </div>
                  <p className="text-xs text-white/40">
                    {strategy.corpus_size} posts analysés · {strategy.created_ago}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {strategy.status === 'completed' && (
                    <button onClick={() => onLoad(strategy.id)}
                      className="text-xs px-2.5 py-1.5 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 rounded-lg transition-colors">
                      Ouvrir
                    </button>
                  )}
                  {strategy.has_pdf && (
                    <button onClick={() => onDownloadPdf(strategy.id, strategy.niche)}
                      className="p-1.5 text-white/30 hover:text-purple-400 rounded-lg transition-colors">
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={() => onDelete(strategy.id)}
                    className="p-1.5 text-white/20 hover:text-red-400 rounded-lg transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}