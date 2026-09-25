// AnalyticsPage.jsx
// Agent Analytics IA — Dashboard Professionnel Social Mind AI
// Prophet · XGBoost · Random Forest · Matplotlib + Seaborn · ReportLab
// Meta Graph API v21 (collecte toutes les 6h) · an_metrics · an_reports
// ⚠️ Aucun modèle HuggingFace requis — 100% CPU

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Download } from 'lucide-react'
import { toast } from 'sonner'
import { analyticsApi } from '@/api/analyticsApi'

// ── Configuration ──────────────────────────────────────────────
const TABS = [
  { id: 'kpis',     label: '📊 KPIs'         },
  { id: 'charts',   label: '📈 Graphiques'    },
  { id: 'forecast', label: '🔮 Prédictions'   },
  { id: 'reports',  label: '📄 Rapports PDF'  },
]

const CHART_TABS = [
  { key: 'trend',        label: '📈 Tendance'     },
  { key: 'forecast',     label: '🔮 Prophet'      },
  { key: 'content_type', label: '🎨 Types'        },
  { key: 'heatmap',      label: '🕐 Heatmap'      },
  { key: 'importance',   label: '🤖 Features'     },
  { key: 'distribution', label: '📊 Distribution' },
  { key: 'platforms',    label: '📱 Plateformes'  },
]

const CONTENT_TYPES = ['Reel', 'Carrousel', 'Photo', 'Story', 'Article', 'Vidéo']
const PLATFORMS     = ['instagram', 'tiktok', 'facebook', 'linkedin']
const DAYS_FR       = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const KPI_CARDS = [
  { key: 'total_posts',         label: 'Total Posts',       icon: '📝', color: 'indigo', fmt: v => v },
  { key: 'avg_engagement_rate', label: 'Engagement Moyen',  icon: '⚡', color: 'green',  fmt: v => `${v}%` },
  { key: 'avg_reach',           label: 'Portée Moyenne',    icon: '👀', color: 'blue',   fmt: v => v?.toLocaleString('fr-FR') },
  { key: 'total_reach',         label: 'Portée Totale',     icon: '🌐', color: 'purple', fmt: v => v?.toLocaleString('fr-FR') },
  { key: 'total_likes',         label: 'Likes Totaux',      icon: '👍', color: 'pink',   fmt: v => v?.toLocaleString('fr-FR') },
  { key: 'total_comments',      label: 'Commentaires',      icon: '💬', color: 'amber',  fmt: v => v?.toLocaleString('fr-FR') },
  { key: 'total_shares',        label: 'Partages',          icon: '🔁', color: 'teal',   fmt: v => v?.toLocaleString('fr-FR') },
]

const cn = (...c) => c.filter(Boolean).join(' ')

// ══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function AnalyticsPage({ client }) {
  const [activeTab,    setActiveTab]    = useState('kpis')
  const [data,         setData]         = useState(null)
  const [isLoading,    setIsLoading]    = useState(true)
  const [isCollecting, setIsCollecting] = useState(false)
  const [periodDays,   setPeriodDays]   = useState(30)

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    try {
      const r = await analyticsApi.getDashboard({
        client_id   : client?.id,
        period_days : periodDays,
        generate_pdf: true,
      })

      if (r.data.status === 'collecting') {
        toast.info('Collecte en cours… Les données seront disponibles dans quelques minutes.')
        setData(null)
      } else {
        setData(r.data)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de chargement Analytics.')
    } finally {
      setIsLoading(false)
    }
  }, [client?.id, periodDays])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const handleCollect = async () => {
    setIsCollecting(true)
    try {
      await analyticsApi.collect()
      toast.success('✅ Collecte Meta Graph API lancée ! Retour dans 30s...')
      setTimeout(() => { loadDashboard(); setIsCollecting(false) }, 30000)
    } catch {
      toast.error('Erreur collecte.')
      setIsCollecting(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* ── En-tête Agent ── */}
      <div className="bg-gradient-to-r from-indigo-900/50 to-blue-900/50 border border-indigo-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">📊</span>
          <div>
            <h2 className="text-xl font-bold text-white">Agent Analytics IA</h2>
            <div className="flex flex-wrap gap-2 mt-1">
              {[
                { label: 'Prophet (prédictions 30j)',         color: 'bg-indigo-500/20 text-indigo-300' },
                { label: 'XGBoost (score engagement)',        color: 'bg-blue-500/20 text-blue-300'    },
                { label: 'Random Forest (importance features)',color: 'bg-purple-500/20 text-purple-300' },
                { label: 'Matplotlib + Seaborn (7 graphiques)',color: 'bg-green-500/20 text-green-300' },
                { label: 'Meta Graph API v21 (/6h)',          color: 'bg-amber-500/20 text-amber-300'  },
              ].map(m => (
                <span key={m.label} className={`text-[10px] px-2 py-0.5 rounded-full font-mono border border-white/10 ${m.color}`}>
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">
          Collecte automatique toutes les 6h via Meta Graph API v21 →
          Prophet prédit la trajectoire 30 jours →
          XGBoost prédit l'engagement d'un futur post →
          Random Forest identifie les facteurs clés →
          7 graphiques Matplotlib + Seaborn →
          Rapport PDF mensuel ReportLab. ⚠️ Aucun GPU requis.
        </p>
      </div>

      {/* ── Contrôles ── */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <label className="text-xs text-white/50">Période :</label>
            <select value={periodDays} onChange={e => setPeriodDays(parseInt(e.target.value))}
              className="bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 text-white text-sm focus:outline-none">
              <option value={7}  className="bg-slate-800">7 derniers jours</option>
              <option value={30} className="bg-slate-800">30 derniers jours</option>
              <option value={60} className="bg-slate-800">60 derniers jours</option>
              <option value={90} className="bg-slate-800">90 derniers jours</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button onClick={handleCollect} disabled={isCollecting}
              className="flex items-center gap-1.5 px-3 py-2 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs hover:bg-indigo-500/10 disabled:opacity-50">
              {isCollecting ? (
                <><div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" /> Collecte...</>
              ) : (
                <><RefreshCw className="h-3.5 w-3.5" /> Forcer collecte</>
              )}
            </button>
            <button onClick={loadDashboard} disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs transition-colors disabled:opacity-50">
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              Actualiser
            </button>
          </div>
        </div>

        {data?.last_collected && (
          <p className="text-[10px] text-white/30 mt-2">
            Dernière collecte : {new Date(data.last_collected).toLocaleString('fr-FR')} ·
            Prochaine dans ~6h (Meta Graph API v21 · an_metrics)
          </p>
        )}
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-16 text-center">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-white/50">Analyse IA en cours…</p>
          <p className="text-xs text-white/30 mt-1">
            Prophet + XGBoost + Random Forest · 7 graphiques · PDF ReportLab
          </p>
        </div>
      )}

      {/* ── Pas de données ── */}
      {!isLoading && !data && (
        <div className="bg-[#1A1A2E] border border-amber-500/20 rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">📡</div>
          <p className="text-sm text-amber-300 font-medium">Collecte en cours depuis Meta Graph API v21</p>
          <p className="text-xs text-white/40 mt-2">
            Les métriques seront disponibles dans quelques minutes.
            Vérifiez que vos comptes Instagram/Facebook sont connectés (Agent Gestionnaire RS).
          </p>
          <button onClick={loadDashboard} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700">
            Réessayer
          </button>
        </div>
      )}

      {/* ── Contenu principal ── */}
      {!isLoading && data && (
        <>
          {/* Navigation onglets */}
          <div className="bg-[#141420] border border-white/5 rounded-xl">
            <div className="flex overflow-x-auto">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                    activeTab === tab.id
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-white/40 hover:text-white/70'
                  )}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'kpis'     && <KpisPanel    data={data} />}
              {activeTab === 'charts'   && <ChartsPanel  data={data} />}
              {activeTab === 'forecast' && <ForecastPanel data={data} />}
              {activeTab === 'reports'  && <ReportPanel  data={data} />}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 1 — KPIs
// ══════════════════════════════════════════════════════════════
function KpisPanel({ data }) {
  const { kpis, weekly_summary, top_posts, perf_type, perf_platform } = data
  const trendUp = kpis?.trend_engagement >= 0

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPI_CARDS.map(card => (
          <div key={card.key} className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{card.icon}</span>
              <p className="text-xs text-white/40 font-medium">{card.label}</p>
            </div>
            <p className="text-2xl font-bold text-white">
              {card.fmt(kpis?.[card.key]) ?? '—'}
            </p>
          </div>
        ))}

        {/* Tendance */}
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">📈</span>
            <p className="text-xs text-white/40 font-medium">Tendance</p>
          </div>
          <p className={cn('text-sm font-bold', trendUp ? 'text-green-400' : 'text-red-400')}>
            {kpis?.trend_direction}
          </p>
          <p className={cn('text-xl font-bold', trendUp ? 'text-green-300' : 'text-red-300')}>
            {kpis?.trend_engagement > 0 ? '+' : ''}{kpis?.trend_engagement}%
          </p>
        </div>
      </div>

      {/* Résumé semaine */}
      {weekly_summary && Object.keys(weekly_summary).length > 0 && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">📅 Résumé Semaine Écoulée</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Posts',          value: weekly_summary.posts_this_week },
              { label: 'Engagement',     value: `${weekly_summary.avg_engagement}% (${weekly_summary.engagement_change > 0 ? '+' : ''}${weekly_summary.engagement_change}%)` },
              { label: 'Reach moy.',     value: weekly_summary.avg_reach?.toLocaleString('fr-FR') },
              { label: 'Meilleur format',value: weekly_summary.best_post_type },
            ].map(({ label, value }) => (
              <div key={label} className="text-center p-3 bg-white/5 rounded-xl">
                <p className="text-xs text-white/40 mb-1">{label}</p>
                <p className="text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance par type */}
      {perf_type?.length > 0 && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5 overflow-x-auto">
          <h3 className="text-sm font-semibold text-white mb-4">🎨 Performance par Type de Contenu</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Type', 'Posts', 'Engagement', 'Reach moy.', 'Likes moy.'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs text-white/40 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perf_type.map((row, i) => (
                <tr key={i} className={cn(
                  'border-b border-white/5',
                  i === 0 ? 'bg-green-500/10' : ''
                )}>
                  <td className="py-2 px-3 font-medium text-white">
                    {i === 0 && <span className="text-xs bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full mr-1">🏆</span>}
                    {row.content_type}
                  </td>
                  <td className="py-2 px-3 text-white/60 text-center">{row.nb_posts}</td>
                  <td className="py-2 px-3 font-semibold text-indigo-300 text-center">{row.avg_engagement?.toFixed(1)}%</td>
                  <td className="py-2 px-3 text-white/60 text-center">{row.avg_reach?.toLocaleString('fr-FR')}</td>
                  <td className="py-2 px-3 text-white/60 text-center">{row.avg_likes?.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top 5 posts */}
      {top_posts?.length > 0 && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">🏆 Top 5 Meilleurs Posts</h3>
          <div className="space-y-3">
            {top_posts.map((post, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-indigo-400">#{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{post.content_type} · {post.platform}</p>
                    <p className="text-xs text-white/40">{post.date}</p>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-white/60">
                  <span>👍 {post.likes?.toLocaleString('fr-FR')}</span>
                  <span>💬 {post.comments?.toLocaleString('fr-FR')}</span>
                  <span className="font-bold text-indigo-300">⚡ {post.engagement_rate?.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 2 — GRAPHIQUES
// ══════════════════════════════════════════════════════════════
function ChartsPanel({ data }) {
  const [activeChart, setActiveChart] = useState('trend')
  const charts = data?.charts || {}

  const chartDescriptions = {
    trend       : "Taux d'engagement journalier avec moyenne mobile 7 jours",
    forecast    : "Prédictions Prophet 30 jours avec intervalles de confiance à 80%",
    content_type: "Engagement moyen et reach par type de contenu",
    heatmap     : "Meilleurs créneaux — plus c'est rouge, plus c'est engageant",
    importance  : "Facteurs influençant l'engagement selon Random Forest",
    distribution: "Répartition des taux d'engagement sur tous les posts",
    platforms   : "Comparaison engagement et reach par plateforme",
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-1">📈 Graphiques Analytiques</h3>
        <p className="text-xs text-white/30 mb-4">Générés par Matplotlib + Seaborn · Données Meta Graph API v21</p>

        {/* Sélecteur graphique */}
        <div className="flex gap-2 flex-wrap mb-5">
          {CHART_TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveChart(tab.key)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                activeChart === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              )}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Graphique actif (base64 PNG) */}
        {charts[activeChart] ? (
          <div className="rounded-xl overflow-hidden border border-white/10">
            <img
              src={`data:image/png;base64,${charts[activeChart]}`}
              alt={`Graphique ${activeChart}`}
              className="w-full"
            />
          </div>
        ) : (
          <div className="h-64 bg-white/5 rounded-xl flex items-center justify-center text-white/20 border-2 border-dashed border-white/10">
            <div className="text-center">
              <p className="text-3xl mb-2">📊</p>
              <p className="text-sm">Graphique non disponible</p>
            </div>
          </div>
        )}

        {/* Légende */}
        {chartDescriptions[activeChart] && (
          <p className="mt-3 text-xs text-white/30 text-center">
            {chartDescriptions[activeChart]}
          </p>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 3 — PRÉDICTIONS (Prophet + XGBoost Simulateur)
// ══════════════════════════════════════════════════════════════
function ForecastPanel({ data }) {
  const { prophet, importance, ml_metrics } = data

  const [contentType,    setContentType]    = useState('Reel')
  const [platform,       setPlatform]       = useState('instagram')
  const [hour,           setHour]           = useState(19)
  const [dayNum,         setDayNum]         = useState(2)
  const [estimatedReach, setEstimatedReach] = useState(3000)
  const [prediction,     setPrediction]     = useState(null)
  const [predicting,     setPredicting]     = useState(false)

  const handlePredict = async () => {
    setPredicting(true)
    try {
      const r = await analyticsApi.predict({
        content_type    : contentType,
        platform,
        hour,
        day_num         : dayNum,
        estimated_reach : estimatedReach,
      })
      setPrediction(r.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur prédiction XGBoost.')
    } finally {
      setPredicting(false)
    }
  }

  const FEATURE_LABELS = {
    reach_log        : "Portée (log)",
    hour             : "Heure de publication",
    day_num          : "Jour de la semaine",
    content_type_enc : "Type de contenu",
    platform_enc     : "Plateforme",
    saves            : "Sauvegardes",
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* Prédictions Prophet */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">🔮 Prédictions Prophet — 30 Jours</h3>
          <p className="text-xs text-white/30 mt-1">
            Basé sur vos données collectées via Meta Graph API v21
          </p>
        </div>

        {prophet && Object.entries(prophet).map(([metric, result]) => {
          const stats    = result.stats
          const isGrowth = stats.growth_pct >= 0
          return (
            <div key={metric} className="p-4 bg-white/5 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-white">{stats.metric_label}</p>
                <span className={cn('text-xs font-bold', isGrowth ? 'text-green-400' : 'text-red-400')}>
                  {stats.growth_pct > 0 ? '+' : ''}{stats.growth_pct}%
                </span>
              </div>
              <div className="flex gap-4 text-xs">
                <div className="text-center">
                  <p className="text-white/40">Actuel (moy. 7j)</p>
                  <p className="font-bold text-indigo-300 text-base">{stats.current_avg}</p>
                </div>
                <div className="text-white/20 flex items-center text-lg">→</div>
                <div className="text-center">
                  <p className="text-white/40">Dans 30 jours</p>
                  <p className={cn('font-bold text-base', isGrowth ? 'text-green-300' : 'text-red-300')}>
                    {stats.predicted_end}
                  </p>
                </div>
                <div className="ml-auto flex items-center">
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    isGrowth ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'
                  )}>
                    {stats.trend_direction}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {/* Importance des features (Random Forest) */}
        {importance?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-white/60 mb-3">
              🌳 Facteurs d'influence — Random Forest
            </h4>
            <div className="space-y-2">
              {importance.slice(0, 5).map((feat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-white/40 w-28 flex-shrink-0">
                    {FEATURE_LABELS[feat.feature] || feat.feature}
                  </span>
                  <div className="flex-1 bg-white/10 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full"
                      style={{ width: `${feat.importance_pct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-indigo-300 w-10 text-right">
                    {feat.importance_pct}%
                  </span>
                </div>
              ))}
            </div>
            {ml_metrics && (
              <p className="text-[10px] text-white/25 mt-3">
                XGBoost · MAE : {ml_metrics.mae} · R² : {ml_metrics.r2} · {ml_metrics.n_train} posts d'entraînement
              </p>
            )}
          </div>
        )}
      </div>

      {/* Simulateur XGBoost */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-1">🎯 Simulateur d'Engagement</h3>
        <p className="text-xs text-white/30 mb-4">
          XGBoost prédit le score pour votre prochain post
        </p>

        <div className="space-y-3">
          {/* Type de contenu */}
          <div>
            <label className="block text-xs text-white/50 mb-1">Type de contenu</label>
            <select value={contentType} onChange={e => setContentType(e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
              {CONTENT_TYPES.map(t => <option key={t} className="bg-slate-800">{t}</option>)}
            </select>
          </div>

          {/* Plateforme */}
          <div>
            <label className="block text-xs text-white/50 mb-1">Plateforme</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
              {PLATFORMS.map(p => <option key={p} className="bg-slate-800">{p}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Heure */}
            <div>
              <label className="block text-xs text-white/50 mb-1">Heure : {String(hour).padStart(2,'0')}h00</label>
              <input type="range" min={0} max={23} value={hour}
                onChange={e => setHour(parseInt(e.target.value))}
                className="w-full accent-indigo-500" />
            </div>

            {/* Jour */}
            <div>
              <label className="block text-xs text-white/50 mb-1">Jour : {DAYS_FR[dayNum]}</label>
              <input type="range" min={0} max={6} value={dayNum}
                onChange={e => setDayNum(parseInt(e.target.value))}
                className="w-full accent-indigo-500" />
            </div>
          </div>

          {/* Reach estimé */}
          <div>
            <label className="block text-xs text-white/50 mb-1">
              Reach estimé : {estimatedReach.toLocaleString('fr-FR')}
            </label>
            <input type="range" min={100} max={50000} step={100} value={estimatedReach}
              onChange={e => setEstimatedReach(parseInt(e.target.value))}
              className="w-full accent-indigo-500" />
          </div>

          <button onClick={handlePredict} disabled={predicting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {predicting ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Prédiction XGBoost...</>
            ) : (
              <>🎯 Prédire l'engagement</>
            )}
          </button>

          {/* Résultat XGBoost */}
          {prediction && (
            <div className="bg-indigo-500/10 border border-indigo-500/25 rounded-xl p-4">
              <div className="text-center mb-3">
                <p className="text-3xl font-bold text-indigo-300">
                  {prediction.predicted_score}
                </p>
                <p className="text-xs text-white/50 mt-1">Score d'engagement prédit</p>
              </div>
              <p className="text-sm text-center text-white font-medium">
                {prediction.evaluation}
              </p>
              {prediction.inputs && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/40">
                  <span>📱 {prediction.inputs.platform}</span>
                  <span>🎬 {prediction.inputs.content_type}</span>
                  <span>⏰ {prediction.inputs.hour}</span>
                  <span>📅 {prediction.inputs.day}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 4 — RAPPORTS PDF
// ══════════════════════════════════════════════════════════════
function ReportPanel({ data }) {
  const [reports,     setReports]     = useState([])
  const [isLoading,   setIsLoading]   = useState(true)
  const [downloading, setDownloading] = useState(null)

  useEffect(() => {
    analyticsApi.getReports()
      .then(r => setReports(r.data.data?.reports || []))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const handleDownload = async (report) => {
    setDownloading(report.id)
    try {
      const r   = await analyticsApi.downloadReport(report.id)
      const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      const a   = document.createElement('a')
      a.href     = url
      a.download = `rapport_analytics_${report.period_label}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('📥 Rapport téléchargé !')
    } catch { toast.error('Erreur téléchargement.') }
    finally { setDownloading(null) }
  }

  return (
    <div className="space-y-5">

      {/* Rapport du mois en cours */}
      {data.pdf_url && (
        <div className="bg-[#1A1A2E] border border-indigo-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">📄 Rapport Mensuel Disponible</h3>
              <p className="text-xs text-white/40 mt-1">
                ReportLab · Données Meta Graph API v21 · Prophet + XGBoost + Random Forest
              </p>
              <p className="text-[10px] text-white/25 mt-0.5">
                Contenu : KPIs · Prophet 30j · Types · Heatmap · Features RF · Top 5 posts · Recommandations
              </p>
            </div>
            <a href={data.pdf_url} download
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm transition-colors">
              <Download className="h-4 w-4" />
              Télécharger PDF
            </a>
          </div>
        </div>
      )}

      {/* Historique an_reports */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">📋 Historique des Rapports (an_reports)</h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-10 text-white/20">
            <div className="text-3xl mb-2">📄</div>
            <p className="text-sm">Aucun rapport disponible</p>
            <p className="text-xs mt-1">Les rapports sont générés automatiquement le 1er de chaque mois</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => (
              <div key={report.id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/8 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <p className="text-sm font-medium text-white">{report.period_label}</p>
                    <p className="text-xs text-white/40">
                      {report.report_type === 'monthly' ? 'Rapport mensuel' : 'Rapport hebdomadaire'} ·
                      {report.client?.name && <> {report.client.name} ·</>}
                      Généré le {new Date(report.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                {report.pdf_url && (
                  <button onClick={() => handleDownload(report)}
                    disabled={downloading === report.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 rounded-lg text-xs transition-colors disabled:opacity-50">
                    {downloading === report.id ? (
                      <><div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" /> Téléchargement...</>
                    ) : (
                      <><Download className="h-3.5 w-3.5" /> PDF</>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info collecte automatique */}
      <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-indigo-300 mb-2">ℹ️ Collecte automatique des métriques</h4>
        <div className="text-xs text-indigo-300/60 space-y-1">
          <p>• Collecte automatique <strong>toutes les 6 heures</strong> via Laravel Scheduler → table <code>an_metrics</code></p>
          <p>• Source 1 : <strong>Meta Graph API v21</strong> — Instagram Business + Facebook Pages</p>
          <p>• Source 2 : <strong>Playwright</strong> — Scraping Instagram public complémentaire</p>
          <p>• Métriques : Likes · Commentaires · Partages · Portée · Impressions · Sauvegardes</p>
          <p>• Rapport PDF mensuel généré automatiquement le 1er de chaque mois → table <code>an_reports</code></p>
          <p>• Prédictions : <strong>Prophet</strong> (30j) · <strong>XGBoost</strong> (score engagement) · <strong>Random Forest</strong> (features)</p>
          <p>• ⚠️ Aucun GPU requis — 100% CPU · Aucun modèle HuggingFace</p>
        </div>
      </div>
    </div>
  )
}