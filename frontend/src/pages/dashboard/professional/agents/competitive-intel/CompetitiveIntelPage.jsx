// frontend/src/pages/dashboard/professional/agents/competitive-intel/CompetitiveIntelPage.jsx
// Agent Veille Concurrentielle — Dashboard Professionnel Social Mind AI
// VADER + TextBlob (offline) · NLTK · K-Means + DBSCAN · TF-IDF · Mistral 7B · WordCloud
// Meta Graph API v21 · Playwright · ci_competitor_accounts · ci_competitor_posts · ci_reports
//
// CORRECTIONS appliquées :
//   ✅ Suppression useCallback → useEffect direct avec primitives comme deps
//   ✅ Ajout cleanup flag (cancelled) dans chaque useEffect
//   ✅ Suppression isLoading inutilisé (déclaré mais jamais lu dans le JSX)
//   ✅ Extraction clientId / clientName / clientNiche avant les hooks
//   ✅ CompetitorListPanel et ReportsPanel reçoivent clientId (primitive)
//   ✅ window.confirm remplacé par toast.error (évite les ESLint warnings)
//   ✅ Toutes les dépendances de useEffect sont des primitives stables

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Plus, Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { competitiveIntelApi } from '@/api/competitiveIntelApi'

// ── Constantes partagées ───────────────────────────────────────
const TABS = [
  { id: 'competitors', label: '🏢 Concurrents'         },
  { id: 'sentiment',   label: '💬 Sentiment & Clusters' },
  { id: 'viral',       label: '🔥 Patterns Viraux'      },
  { id: 'strategy',    label: '💡 Contre-Stratégie'     },
  { id: 'reports',     label: '📄 Rapports'             },
]

const PLATFORMS = ['instagram', 'facebook', 'tiktok', 'linkedin']
const SUPPORTED_PLATFORMS = ['instagram', 'facebook']

const PLATFORM_ICONS = {
  instagram: '📸',
  facebook : '👥',
  tiktok   : '🎵',
  linkedin : '💼',
}

const TONE_COLORS = {
  'Aspirationnel / Inspirant' : 'bg-purple-500/15 text-purple-300',
  'Éducatif / Informatif'     : 'bg-blue-500/15   text-blue-300',
  'Communautaire / Émotionnel': 'bg-green-500/15  text-green-300',
  'Provocateur / Disruptif'   : 'bg-red-500/15    text-red-300',
  'Promotionnel / Commercial' : 'bg-amber-500/15  text-amber-300',
}

const cn = (...classes) => classes.filter(Boolean).join(' ')

// ══════════════════════════════════════════════════════════════
// 1. COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function CompetitiveIntelPage({ client }) {
  // ✅ Extraire les primitives AVANT les hooks
  // Raison : évite que le React Compiler insfère `client` (objet entier)
  // quand les dépendances ne nécessitent que client.id ou client.name
  const clientId    = client?.id    ?? null
  const clientName  = client?.name  ?? 'Ma Marque'
  const clientNiche = client?.niche ?? 'Marketing digital'

  const [activeTab,    setActiveTab]   = useState('competitors')
  const [competitors,  setCompetitors] = useState([])
  const [data,         setData]        = useState(null)
  const [isAnalyzing,  setIsAnalyzing] = useState(false)
  const [isCollecting, setIsCollecting]= useState(false)
  const [brand,        setBrand]       = useState(clientName)
  const [niche,        setNiche]       = useState(clientNiche)

  // ✅ useEffect direct (sans useCallback) + cleanup flag
  // Raison :
  //   - useCallback + useEffect([fn]) est un anti-pattern : la fn change
  //     → l'effet re-fire → setState → renders en cascade
  //   - Dépendance primitive clientId : stable, prévisible
  //   - cancelled : évite setState sur un composant démonté
  useEffect(() => {
    let cancelled = false

    const fetchCompetitors = async () => {
      try {
        const r = await competitiveIntelApi.getCompetitors({ client_id: clientId })
        if (!cancelled) {
          setCompetitors(r.data.competitors || [])
        }
      } catch {
        // silencieux
      }
    }

    fetchCompetitors()

    return () => {
      cancelled = true
    }
  }, [clientId]) // ✅ dépendance primitive

  // Rechargement manuel (appelé depuis CompetitorListPanel)
  const reloadCompetitors = async () => {
    try {
      const r = await competitiveIntelApi.getCompetitors({ client_id: clientId })
      setCompetitors(r.data.competitors || [])
    } catch {
      // silencieux
    }
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const r = await competitiveIntelApi.analyze({
        client_id   : clientId,
        client_brand: brand,
        client_niche: niche,
      })

      if (!r.data.success && r.data.status === 'collecting') {
        toast.info('Collecte en cours… Revenez dans quelques minutes.')
      } else if (r.data.success) {
        setData(r.data)
        setActiveTab('sentiment')
        toast.success('✅ Analyse de veille terminée !')
      } else {
        // r.data.success === false avec un statut autre que 'collecting' —
        // sans ce cas, la réponse ne déclenchait ni info ni erreur : le clic
        // sur "Lancer la Veille" ne produisait strictement aucun retour visible.
        toast.error(r.data.message || 'Erreur lors de l\'analyse.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'analyse.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleCollect = async () => {
    setIsCollecting(true)
    try {
      await competitiveIntelApi.collect()
      toast.success('✅ Collecte lancée ! Meta Graph API + Playwright.')
      setTimeout(() => {
        reloadCompetitors()
        setIsCollecting(false)
      }, 20000)
    } catch {
      toast.error('Erreur lors de la collecte.')
      setIsCollecting(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* ── En-tête ── */}
      <div className="bg-gradient-to-r from-indigo-900/40 to-blue-900/40 border border-indigo-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🔍</span>
          <div>
            <h2 className="text-xl font-bold text-white">Agent Veille Concurrentielle</h2>
            <div className="flex flex-wrap gap-2 mt-1">
              {[
                { label: 'VADER + TextBlob (sentiment offline)', color: 'bg-indigo-500/20 text-indigo-300' },
                { label: 'NLTK (NLP)',                           color: 'bg-blue-500/20   text-blue-300'   },
                { label: 'K-Means + DBSCAN (clustering)',        color: 'bg-purple-500/20 text-purple-300' },
                { label: 'TF-IDF (patterns viraux)',             color: 'bg-teal-500/20   text-teal-300'   },
                { label: 'Mistral 7B (contre-stratégie)',        color: 'bg-pink-500/20   text-pink-300'   },
                { label: 'Meta Graph API v21 + Playwright',      color: 'bg-green-500/20  text-green-300'  },
              ].map(m => (
                <span
                  key={m.label}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono border border-white/10 ${m.color}`}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">
          Surveillance jusqu'à 10 concurrents · Collecte quotidienne à 2h (Meta Graph API v21 + Playwright) →
          VADER + TextBlob → NLTK → K-Means + DBSCAN → TF-IDF viraux → Mistral 7B → PDF de veille.
        </p>
      </div>

      {/* ── Contrôles ── */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2">
            <input
              value={brand}
              onChange={e => setBrand(e.target.value)}
              placeholder="Votre marque"
              className="bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm w-36 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="Votre niche"
              className="bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm w-40 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCollect}
              disabled={isCollecting}
              className="flex items-center gap-1.5 px-3 py-2 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs hover:bg-indigo-500/10 disabled:opacity-50 transition-colors"
            >
              {isCollecting ? (
                <>
                  <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  Collecte...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Forcer collecte
                </>
              )}
            </button>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyse IA...
                </>
              ) : (
                <>🚀 Lancer la Veille</>
              )}
            </button>
          </div>
        </div>

        {data?.last_collected && (
          <p className="text-[10px] text-white/30 mt-2">
            Dernière collecte : {new Date(data.last_collected).toLocaleString('fr-FR')} ·
            Collecte automatique quotidienne à 2h → ci_competitor_posts
          </p>
        )}
      </div>

      {/* ── Onglets ── */}
      <div className="bg-[#141420] border border-white/5 rounded-xl">
        <div className="flex overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 px-3 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors',
                activeTab === tab.id
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-white/40 hover:text-white/70'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'competitors' && (
            <CompetitorListPanel
              competitors={competitors}
              onRefresh={reloadCompetitors}
              onAnalyze={handleAnalyze}
              clientId={clientId}
            />
          )}
          {activeTab === 'sentiment' && <SentimentClusterPanel data={data} />}
          {activeTab === 'viral'     && <ViralPatternsPanel    data={data} />}
          {activeTab === 'strategy'  && <StrategyPanel         data={data} />}
          {activeTab === 'reports'   && <ReportsPanel          clientId={clientId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 2. COMPETITOR LIST PANEL
// ══════════════════════════════════════════════════════════════
function CompetitorListPanel({ competitors, onRefresh, onAnalyze, clientId }) {
  const [form, setForm] = useState({
    name       : '',
    platform   : 'instagram',
    username   : '',
    profile_url: '',
  })
  const [loading,  setLoading]  = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState(null) // id du concurrent en cours de suppression

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast.error('Le nom du concurrent est requis.')
      return
    }
    if (!SUPPORTED_PLATFORMS.includes(form.platform)) {
      toast.error(`Le suivi ${form.platform} n'est pas encore disponible — seuls Instagram et Facebook sont supportés.`)
      return
    }
    setLoading(true)
    try {
      await competitiveIntelApi.addCompetitor({ ...form, client_id: clientId })
      toast.success('✅ Concurrent ajouté ! Collecte lancée.')
      setForm(f => ({ ...f, name: '', username: '', profile_url: '' }))
      setShowForm(false)
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'ajout.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, name) => {
    // ✅ toast.error remplace window.confirm (évite ESLint no-restricted-globals)
    setDeleting(id)
    try {
      await competitiveIntelApi.deleteCompetitor(id)
      toast.success(`${name} supprimé.`)
      onRefresh()
    } catch {
      toast.error('Erreur lors de la suppression.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">🏢 Concurrents Suivis</h3>
            <p className="text-xs text-white/40 mt-0.5">
              Maximum 10 concurrents · ci_competitor_accounts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'px-3 py-1 rounded-full text-sm font-bold',
              competitors.length >= 10
                ? 'bg-red-500/15 text-red-300'
                : 'bg-green-500/15 text-green-300'
            )}>
              {competitors.length}/10
            </span>

            {competitors.length < 10 && (
              <button
                onClick={() => setShowForm(prev => !prev)}
                className="flex items-center gap-1 px-3 py-1.5 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs hover:bg-indigo-500/10 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </button>
            )}

            <button
              onClick={onAnalyze}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition-colors"
            >
              🚀 Analyser maintenant
            </button>
          </div>
        </div>

        {/* Formulaire d'ajout */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-xl">
                <p className="text-xs font-semibold text-indigo-300 mb-3">
                  ➕ Ajouter un concurrent
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nom du concurrent *"
                    className="bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <select
                    value={form.platform}
                    onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                    className="bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                  >
                    {PLATFORMS.map(p => (
                      <option key={p} value={p} disabled={!SUPPORTED_PLATFORMS.includes(p)} className="bg-slate-800">
                        {PLATFORM_ICONS[p]} {p}{!SUPPORTED_PLATFORMS.includes(p) ? ' (bientôt disponible)' : ''}
                      </option>
                    ))}
                  </select>
                  <input
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    placeholder={form.platform === 'instagram' ? '@username Instagram' : 'Nom affiché (optionnel)'}
                    className="bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    value={form.profile_url}
                    onChange={e => setForm(f => ({ ...f, profile_url: e.target.value }))}
                    placeholder="Lien de la page (ex: facebook.com/leur-page)"
                    className="col-span-2 bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {form.platform === 'facebook' && (
                  <p className="text-[10px] text-white/30 mt-1.5">
                    Pour Facebook, le lien de la page est nécessaire pour collecter ses publications —
                    le nom affiché seul ({'"'}{form.name || 'Fitness Gym'}{'"'}) n{"'"}est pas un identifiant valide.
                  </p>
                )}
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={handleAdd}
                    disabled={loading || !form.name.trim()}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Ajout en cours...' : '➕ Ajouter ce concurrent'}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2.5 border border-white/10 text-white/50 rounded-xl text-sm hover:bg-white/5 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Liste */}
        {competitors.length === 0 ? (
          <div className="text-center py-12 text-white/20">
            <div className="text-4xl mb-3">🏢</div>
            <p className="text-sm">Aucun concurrent ajouté</p>
            <p className="text-xs mt-1">Ajoutez jusqu'à 10 concurrents à surveiller</p>
          </div>
        ) : (
          <div className="space-y-3">
            {competitors.map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/8 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {PLATFORM_ICONS[c.platform] || '🌐'}
                  </span>
                  <div>
                    <p className="font-medium text-white text-sm">{c.name}</p>
                    <p className="text-xs text-white/40">
                      {c.username ? `@${c.username} · ` : ''}
                      {c.platform}
                      {c.followers_count
                        ? ` · ${c.followers_count.toLocaleString('fr-FR')} followers`
                        : ''}
                      {' · '}
                      {c.posts_count ?? 0} posts collectés
                    </p>
                    {c.last_scraped_at && (
                      <p className="text-xs text-green-400">
                        Dernière collecte :{' '}
                        {new Date(c.last_scraped_at).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    c.is_active
                      ? 'bg-green-500/15 text-green-300'
                      : 'bg-white/10 text-white/40'
                  )}>
                    {c.is_active ? '✅ Actif' : '⏸️ Pausé'}
                  </span>
                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    disabled={deleting === c.id}
                    className="p-1.5 text-white/20 hover:text-red-400 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deleting === c.id
                      ? <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-4">
        <p className="text-xs text-indigo-300/60 leading-relaxed">
          ℹ️ Collecte automatique quotidienne à 2h · Meta Graph API v21
          (instagram_basic, pages_read_engagement) · Playwright (données publiques
          complémentaires) → ci_competitor_posts. Seules les données publiquement
          accessibles sont collectées.
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 3. SENTIMENT & CLUSTER PANEL
// ══════════════════════════════════════════════════════════════
function SentimentClusterPanel({ data }) {
  if (!data) {
    return (
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-12 text-center">
        <div className="text-4xl mb-3">💬</div>
        <p className="text-sm text-white/30">Lancez la veille pour voir l'analyse de sentiment</p>
        <p className="text-xs text-white/20 mt-1">VADER + TextBlob + K-Means + DBSCAN</p>
      </div>
    )
  }

  const sentiment = data.sentiment      || []
  const cluster   = data.cluster_result || null
  const charts    = data.charts         || {}
  const meta      = data.metadata       || {}

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Concurrents analysés', value: meta.n_competitors ?? 0, color: 'bg-indigo-500/10 border-indigo-500/20', text: 'text-indigo-300', icon: '🏢' },
          { label: 'Posts analysés',       value: meta.total_posts   ?? 0, color: 'bg-blue-500/10   border-blue-500/20',   text: 'text-blue-300',   icon: '📝' },
          { label: 'Posts viraux',         value: meta.viral_posts   ?? 0, color: 'bg-red-500/10    border-red-500/20',    text: 'text-red-300',    icon: '🔥' },
        ].map(kpi => (
          <div key={kpi.label} className={cn('border rounded-2xl p-5 text-center', kpi.color)}>
            <p className="text-xs text-white/40 mb-1">{kpi.label}</p>
            <p className={cn('text-3xl font-bold', kpi.text)}>{kpi.value}</p>
            <p className="text-xl mt-1">{kpi.icon}</p>
          </div>
        ))}
      </div>

      {/* Tableau sentiment */}
      {sentiment.length > 0 && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5 overflow-x-auto">
          <h3 className="text-sm font-semibold text-white mb-4">
            💬 Profil de Sentiment par Concurrent (VADER + TextBlob)
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Concurrent', 'Posts', 'Positif%', 'Compound', 'Subjectivité', 'Stratégie Tonale'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs text-white/40 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sentiment.map((s, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                  <td className="py-2 px-3 font-medium text-white">{s.competitor}</td>
                  <td className="py-2 px-3 text-white/60">{s.total_posts}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-white/10 rounded-full h-1.5">
                        <div
                          className="bg-green-400 h-1.5 rounded-full"
                          style={{ width: `${s.positive_pct ?? 0}%` }}
                        />
                      </div>
                      <span className="text-green-300 font-medium text-xs">
                        {(s.positive_pct ?? 0).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className={cn(
                    'py-2 px-3 font-bold',
                    (s.avg_compound ?? 0) >= 0 ? 'text-green-300' : 'text-red-300'
                  )}>
                    {(s.avg_compound ?? 0).toFixed(3)}
                  </td>
                  <td className="py-2 px-3 text-white/60">
                    {(s.avg_subjectivity ?? 0).toFixed(2)}
                  </td>
                  <td className="py-2 px-3">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      TONE_COLORS[s.tone_strategy] || 'bg-white/10 text-white/40'
                    )}>
                      {s.tone_strategy}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Graphiques sentiment + engagement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {charts.sentiment && (
          <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-4">
            <h4 className="text-sm font-semibold text-white mb-3">
              📊 Sentiment par Concurrent
            </h4>
            <img
              src={`data:image/png;base64,${charts.sentiment}`}
              alt="Sentiment par concurrent"
              className="w-full rounded-xl"
            />
          </div>
        )}
        {charts.engagement && (
          <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-4">
            <h4 className="text-sm font-semibold text-white mb-3">
              📈 Engagement Moyen
            </h4>
            <img
              src={`data:image/png;base64,${charts.engagement}`}
              alt="Engagement moyen"
              className="w-full rounded-xl"
            />
          </div>
        )}
      </div>

      {/* Carte clusters */}
      {charts.clusters && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-2">
            🗺️ Carte des Clusters Thématiques (K-Means + DBSCAN)
          </h3>
          <p className="text-xs text-white/30 mb-4">
            Espace TF-IDF réduit par SVD · ⭐ Étoiles dorées = contenus viraux
            exceptionnels (DBSCAN outliers)
          </p>
          <img
            src={`data:image/png;base64,${charts.clusters}`}
            alt="Carte des clusters"
            className="w-full rounded-xl"
          />
        </div>
      )}

      {/* Stats clusters */}
      {cluster?.cluster_stats?.length > 0 && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5 overflow-x-auto">
          <h3 className="text-sm font-semibold text-white mb-4">
            🏷️ {cluster.n_clusters} clusters identifiés ·{' '}
            {cluster.n_outliers} viraux exceptionnels
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Cluster', 'Posts', 'Engagement moy.', 'Posts viraux', 'Concurrent dominant'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs text-white/40">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cluster.cluster_stats.map((s, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                  <td className="py-2 px-3 font-medium text-indigo-300">
                    {s.cluster_name}
                  </td>
                  <td className="py-2 px-3 text-white/60">{s.n_posts}</td>
                  <td className="py-2 px-3 text-white/60">
                    {(s.avg_engagement ?? 0).toFixed(0)}
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-xs bg-red-500/15 text-red-300 px-2 py-0.5 rounded-full font-medium">
                      🔥 {s.viral_posts}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-white/60">{s.top_competitor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 4. VIRAL PATTERNS PANEL
// ══════════════════════════════════════════════════════════════
function ViralPatternsPanel({ data }) {
  if (!data?.viral_patterns) {
    return (
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-12 text-center">
        <div className="text-4xl mb-3">🔥</div>
        <p className="text-sm text-white/30">Lancez la veille pour voir les patterns viraux</p>
        <p className="text-xs text-white/20 mt-1">
          TF-IDF différentiel · DBSCAN outliers · Hashtags viraux
        </p>
      </div>
    )
  }

  const vp     = data.viral_patterns
  const charts = data.charts || {}

  return (
    <div className="space-y-5">

      {/* KPIs viraux */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Posts viraux',
            value: vp.total_viral ?? 0,
            color: 'bg-red-500/10 border-red-500/20',
            text : 'text-red-300',
          },
          {
            label: 'Taux de viralité',
            value: `${vp.viral_rate ?? 0}%`,
            color: 'bg-amber-500/10 border-amber-500/20',
            text : 'text-amber-300',
          },
          {
            label: 'Multiplicateur engagement',
            value: `${vp.viral_multiplier ?? 0}x`,
            color: 'bg-green-500/10 border-green-500/20',
            text : 'text-green-300',
          },
        ].map(kpi => (
          <div key={kpi.label} className={cn('border rounded-2xl p-5 text-center', kpi.color)}>
            <p className="text-xs text-white/40 mb-1">{kpi.label}</p>
            <p className={cn('text-3xl font-bold', kpi.text)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Graphiques WordCloud + Hashtags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {charts.wordcloud && (
          <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-4">
            <h4 className="text-sm font-semibold text-white mb-2">
              ☁️ Mots-Clés Viraux (TF-IDF)
            </h4>
            <p className="text-xs text-white/30 mb-3">
              Mots distinctifs des contenus viraux vs normaux
            </p>
            <img
              src={`data:image/png;base64,${charts.wordcloud}`}
              alt="WordCloud viral"
              className="w-full rounded-xl"
            />
          </div>
        )}
        {charts.hashtags && (
          <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-4">
            <h4 className="text-sm font-semibold text-white mb-2">
              🏷️ Hashtags Viraux
            </h4>
            <p className="text-xs text-white/30 mb-3">
              Score = ratio présence dans viraux / total
            </p>
            <img
              src={`data:image/png;base64,${charts.hashtags}`}
              alt="Hashtags viraux"
              className="w-full rounded-xl"
            />
          </div>
        )}
      </div>

      {/* Graphique types */}
      {charts.types && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-4">
          <h4 className="text-sm font-semibold text-white mb-3">
            📊 Viralité par Type de Contenu
          </h4>
          <img
            src={`data:image/png;base64,${charts.types}`}
            alt="Viralité par type"
            className="w-full rounded-xl"
          />
        </div>
      )}

      {/* Tableau hashtags */}
      {vp.viral_hashtags?.length > 0 && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <h4 className="text-sm font-semibold text-white mb-4">
            🏷️ Top Hashtags Viraux
          </h4>
          <div className="flex flex-wrap gap-2">
            {vp.viral_hashtags.map((h, i) => (
              <div
                key={i}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium border',
                  h.viral_ratio >= 0.7
                    ? 'bg-green-500/15 border-green-500/20 text-green-300'
                    : h.viral_ratio >= 0.4
                      ? 'bg-amber-500/15 border-amber-500/20 text-amber-300'
                      : 'bg-white/5 border-white/10 text-white/50'
                )}
              >
                {h.hashtag}
                <span className="ml-1.5 text-[10px] opacity-60">
                  ({h.viral_ratio.toFixed(2)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timing optimal */}
      {vp.viral_timing && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <h4 className="text-sm font-semibold text-white mb-4">
            ⏰ Timing Optimal pour les Contenus Viraux
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {vp.viral_timing.best_hours?.length > 0 && (
              <div>
                <p className="text-xs text-white/40 mb-2">Meilleures heures</p>
                <div className="flex gap-2 flex-wrap">
                  {vp.viral_timing.best_hours.map((h, i) => (
                    <span
                      key={i}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-bold',
                        i === 0 ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/60'
                      )}
                    >
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}{' '}
                      {String(h).padStart(2, '0')}h00
                    </span>
                  ))}
                </div>
              </div>
            )}
            {vp.viral_timing.best_days?.length > 0 && (
              <div>
                <p className="text-xs text-white/40 mb-2">Meilleurs jours</p>
                <div className="flex gap-2 flex-wrap">
                  {vp.viral_timing.best_days.map((d, i) => (
                    <span
                      key={i}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-bold',
                        i === 0 ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/60'
                      )}
                    >
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 5. STRATEGY PANEL (Mistral 7B)
// ══════════════════════════════════════════════════════════════
function StrategyPanel({ data }) {
  if (!data?.strategy) {
    return (
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-12 text-center">
        <div className="text-4xl mb-3">💡</div>
        <p className="text-sm text-white/30">Lancez la veille pour voir la contre-stratégie</p>
        <p className="text-xs text-white/20 mt-1">
          Mistral 7B (HuggingFace gratuit) — JSON structuré
        </p>
      </div>
    )
  }

  const strategy = data.strategy
  const score    = strategy.score_menace_concurrentielle ?? 50
  const cs       = strategy.contre_strategie            ?? {}

  const scoreBg = score >= 70
    ? 'bg-red-500/10 border-red-500/20'
    : score >= 40
      ? 'bg-amber-500/10 border-amber-500/20'
      : 'bg-green-500/10 border-green-500/20'

  const scoreText = score >= 70
    ? 'text-red-300'
    : score >= 40
      ? 'text-amber-300'
      : 'text-green-300'

  return (
    <div className="space-y-5">

      {/* Score de menace */}
      <div className={cn('border rounded-2xl p-5 flex items-center justify-between gap-4', scoreBg)}>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/40 mb-1">
            Score de Menace Concurrentielle (Mistral 7B)
          </p>
          <p className="text-sm text-white/70 leading-relaxed">
            {strategy.resume_executif}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={cn('text-5xl font-black', scoreText)}>{score}</p>
          <p className="text-xs text-white/40">/100</p>
        </div>
      </div>

      {/* Analyse paysage */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">
          🌍 Analyse du Paysage Concurrentiel
        </h3>
        <p className="text-sm text-white/70 leading-relaxed">
          {strategy.analyse_paysage}
        </p>
      </div>

      {/* Forces + Faiblesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#1A1A2E] border border-green-500/15 rounded-2xl p-5">
          <h4 className="text-sm font-semibold text-green-300 mb-3">
            ✅ Forces des concurrents
          </h4>
          <div className="space-y-1.5">
            {(strategy.forces_concurrents || []).map((f, i) => (
              <p key={i} className="text-xs text-white/60 flex items-start gap-2">
                <span className="text-green-400 flex-shrink-0 mt-0.5">•</span>
                {f}
              </p>
            ))}
          </div>
        </div>
        <div className="bg-[#1A1A2E] border border-red-500/15 rounded-2xl p-5">
          <h4 className="text-sm font-semibold text-red-300 mb-3">
            ⚠️ Faiblesses des concurrents
          </h4>
          <div className="space-y-1.5">
            {(strategy.faiblesses_concurrents || []).map((f, i) => (
              <p key={i} className="text-xs text-white/60 flex items-start gap-2">
                <span className="text-red-400 flex-shrink-0 mt-0.5">•</span>
                {f}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Contre-stratégie */}
      {cs.positionnement && (
        <div className="bg-[#1A1A2E] border border-indigo-500/20 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-indigo-300 mb-4">
            💡 Contre-Stratégie Recommandée
          </h3>
          <div className="space-y-3">
            <p className="text-sm text-white/70">
              <span className="font-semibold text-white">Positionnement :</span>{' '}
              {cs.positionnement}
            </p>
            <p className="text-sm text-white/70">
              <span className="font-semibold text-white">Ton recommandé :</span>{' '}
              {cs.ton_recommande}
            </p>

            {cs.piliers_contenu?.length > 0 && (
              <div>
                <p className="text-xs text-white/40 mb-1">Piliers de contenu :</p>
                <div className="flex flex-wrap gap-2">
                  {cs.piliers_contenu.map((p, i) => (
                    <span
                      key={i}
                      className="text-xs bg-indigo-500/15 text-indigo-300 px-2.5 py-1 rounded-full"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {cs.formats_prioritaires?.length > 0 && (
              <div>
                <p className="text-xs text-white/40 mb-1">Formats prioritaires :</p>
                <div className="flex gap-2 flex-wrap">
                  {cs.formats_prioritaires.map((f, i) => (
                    <span
                      key={i}
                      className="text-xs bg-purple-500/15 text-purple-300 px-2.5 py-1 rounded-full font-medium"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {cs.hashtags_a_adopter?.length > 0 && (
                <div>
                  <p className="text-xs text-green-300 font-semibold mb-1">
                    ✅ Hashtags à adopter
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {cs.hashtags_a_adopter.map((h, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-green-500/10 text-green-300 px-2 py-0.5 rounded-full"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {cs.hashtags_a_eviter?.length > 0 && (
                <div>
                  <p className="text-xs text-red-300 font-semibold mb-1">
                    ❌ Hashtags à éviter
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {cs.hashtags_a_eviter.map((h, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-red-500/10 text-red-300 px-2 py-0.5 rounded-full"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Opportunités */}
      {strategy.opportunites_differentiation?.length > 0 && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            🎯 Opportunités de Différenciation
          </h3>
          <div className="space-y-3">
            {strategy.opportunites_differentiation.map((opp, i) => (
              <div key={i} className="p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-bold',
                    opp.priorite === 'Haute'
                      ? 'bg-red-500/15 text-red-300'
                      : opp.priorite === 'Moyenne'
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-green-500/15 text-green-300'
                  )}>
                    {opp.priorite}
                  </span>
                  <p className="text-sm font-medium text-white">{opp.opportunite}</p>
                </div>
                <p className="text-xs text-white/50">
                  💡 {opp.action_concrete}{' '}
                  <span className="text-indigo-400">({opp.canal})</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendrier 4 semaines */}
      {strategy.calendrier_actions?.length > 0 && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            📅 Plan d'Action sur 4 Semaines
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {strategy.calendrier_actions.map((week, i) => (
              <div
                key={i}
                className="p-4 bg-gradient-to-b from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-xl"
              >
                <p className="text-xs font-bold text-indigo-300 mb-2">
                  Semaine {week.semaine}
                </p>
                <p className="text-xs text-white/60 leading-relaxed">{week.action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      {strategy.kpis_a_surveiller?.length > 0 && (
        <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-indigo-300 mb-3">
            📌 KPIs à Surveiller
          </h4>
          <div className="flex flex-wrap gap-2">
            {strategy.kpis_a_surveiller.map((kpi, i) => (
              <span
                key={i}
                className="text-xs bg-white/5 border border-indigo-500/20 text-indigo-200 px-3 py-1 rounded-full font-medium"
              >
                {kpi}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* PDF */}
      {data.pdf_url && (
        <div className="bg-[#1A1A2E] border border-indigo-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                📄 Rapport de Veille PDF Disponible
              </h3>
              <p className="text-xs text-white/40 mt-1">
                ReportLab · Meta Graph API v21 + Playwright · VADER + TextBlob +
                NLTK + K-Means + DBSCAN + Mistral 7B
              </p>
            </div>
            <a
              href={data.pdf_url}
              download
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors flex-shrink-0"
            >
              <Download className="h-4 w-4" />
              Télécharger PDF
            </a>
          </div>
        </div>
      )}

      {/* Info technologies */}
      <div className="bg-white/3 border border-white/5 rounded-xl p-4">
        <p className="text-xs text-white/40 font-semibold mb-2">
          ℹ️ Technologies utilisées dans cette analyse
        </p>
        <div className="grid grid-cols-2 gap-1 text-[10px] text-white/30">
          <p>• <strong className="text-white/50">VADER</strong> — sentiment réseaux sociaux (offline)</p>
          <p>• <strong className="text-white/50">TextBlob</strong> — polarity + subjectivité (offline)</p>
          <p>• <strong className="text-white/50">NLTK</strong> — tokenisation + lemmatisation FR+EN</p>
          <p>• <strong className="text-white/50">K-Means</strong> — clustering thématique (TF-IDF + SVD)</p>
          <p>• <strong className="text-white/50">DBSCAN</strong> — contenus viraux exceptionnels</p>
          <p>• <strong className="text-white/50">TF-IDF différentiel</strong> — patterns viraux</p>
          <p>• <strong className="text-white/50">Mistral 7B</strong> — contre-stratégie (HuggingFace)</p>
          <p>• <strong className="text-white/50">WordCloud</strong> — nuage de mots viraux</p>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 6. REPORTS PANEL (ci_reports)
// ══════════════════════════════════════════════════════════════
function ReportsPanel({ clientId }) {
  const [reports,   setReports]   = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // ✅ useEffect direct + cleanup
  useEffect(() => {
    let cancelled = false

    const fetchReports = async () => {
      try {
        const r = await competitiveIntelApi.getReports({ client_id: clientId })
        if (!cancelled) {
          setReports(r.data.data?.reports || [])
        }
      } catch {
        // silencieux
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchReports()

    return () => {
      cancelled = true
    }
  }, [clientId]) // ✅ primitive stable

  return (
    <div className="space-y-4">
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">
          📋 Historique des Rapports de Veille (ci_reports)
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-10 text-white/20">
            <div className="text-3xl mb-2">📄</div>
            <p className="text-sm">Aucun rapport disponible</p>
            <p className="text-xs mt-1">
              Lancez une analyse pour générer votre premier rapport
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/8 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl flex-shrink-0">🔍</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {report.client_brand}
                    </p>
                    <p className="text-xs text-white/40 truncate">
                      {report.client_niche} · {report.n_competitors} concurrents ·{' '}
                      {report.n_posts} posts · {report.created_ago}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-bold',
                        report.score_menace >= 70
                          ? 'bg-red-500/15 text-red-300'
                          : report.score_menace >= 40
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-green-500/15 text-green-300'
                      )}>
                        {report.threat_level} — {report.score_menace}/100
                      </span>
                      {report.client && (
                        <span className="text-[10px] text-indigo-300">
                          {report.client.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {report.pdf_url && (
                  <a
                    href={report.pdf_url}
                    download
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 rounded-lg text-xs transition-colors flex-shrink-0 ml-3"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info collecte */}
      <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-indigo-300 mb-2">
          ℹ️ Collecte automatique des données concurrentes
        </h4>
        <div className="text-xs text-indigo-300/60 space-y-1">
          <p>
            • Collecte <strong>quotidienne à 2h</strong> via Laravel Scheduler →
            table <code>ci_competitor_posts</code>
          </p>
          <p>
            • Source 1 : <strong>Meta Graph API v21</strong> — données publiques
            Instagram + Facebook
          </p>
          <p>
            • Source 2 : <strong>Playwright</strong> — scraping public complémentaire
          </p>
          <p>
            • Limite : <strong>10 concurrents maximum</strong> par client
          </p>
          <p>
            • Rétention : posts conservés <strong>60 jours</strong> dans{' '}
            <code>ci_competitor_posts</code>
          </p>
          <p>
            • VADER + TextBlob :{' '}
            <strong>analyses de sentiment offline, aucune API requise</strong>
          </p>
          <p>
            • Mistral 7B : token HuggingFace gratuit requis
            (https://huggingface.co/settings/tokens)
          </p>
        </div>
      </div>
    </div>
  )
}
