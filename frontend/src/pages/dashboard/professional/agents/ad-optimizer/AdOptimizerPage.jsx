// AdOptimizerPage.jsx
// Agent Optimisation Publicitaire — Dashboard Professionnel Social Mind AI
// XGBoost (CTR) · RF + GradientBoosting (segments) · SciPy linprog (budget)
// Q-Learning 24 états × 4 actions (enchères) · Matplotlib + Seaborn · ReportLab
// Meta Ads API v21 · Google Ads API GAQL · ao_campaigns · ao_reports
// ⚠️ Aucun modèle HuggingFace requis — 100% CPU

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Download, Link2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { adOptimizerApi } from '@/api/adOptimizerApi'

// ── Configuration ──────────────────────────────────────────────
const TABS = [
  { id: 'kpis',      label: '📊 KPIs & Campagnes' },
  { id: 'budget',    label: '💰 Budget SciPy'      },
  { id: 'charts',    label: '📈 Graphiques'         },
  { id: 'simulator', label: '🖱️ Simulateur CTR'    },
  { id: 'bid',       label: '🎮 Enchères Q-Learning'},
  { id: 'reports',   label: '📄 Rapports PDF'       },
]

const AD_TYPES  = ['Vidéo', 'Carrousel', 'Image', 'Stories', 'Collection']
const PLATFORMS = ['Meta', 'Google', 'Instagram', 'TikTok', 'LinkedIn']
const AGES      = ['18-24', '25-34', '35-44', '45-54', '55+']
const GENDERS   = ['Male', 'Female', 'All']
const DAYS_FR   = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const KPI_CARDS = [
  { key: 'total_spend',       label: 'Budget Dépensé',   icon: '💰', fmt: v => `${v?.toFixed(2)} €`,   color: 'text-orange-300' },
  { key: 'total_revenue',     label: 'Revenus Générés',  icon: '💵', fmt: v => `${v?.toFixed(2)} €`,   color: 'text-green-300'  },
  { key: 'overall_roas',      label: 'ROAS Global',      icon: '📊', fmt: v => `${v?.toFixed(2)}x`,    color: 'text-blue-300'   },
  { key: 'avg_ctr',           label: 'CTR Moyen',        icon: '🖱️', fmt: v => `${v?.toFixed(3)}%`,    color: 'text-purple-300' },
  { key: 'avg_cpc',           label: 'CPC Moyen',        icon: '💲', fmt: v => `${v?.toFixed(3)} €`,   color: 'text-white/70'   },
  { key: 'avg_cpa',           label: 'CPA Moyen',        icon: '🎯', fmt: v => `${v?.toFixed(2)} €`,   color: 'text-pink-300'   },
  { key: 'total_clicks',      label: 'Clics Totaux',     icon: '👆', fmt: v => v?.toLocaleString('fr-FR'), color: 'text-indigo-300' },
  { key: 'total_conversions', label: 'Conversions',      icon: '✅', fmt: v => v?.toLocaleString('fr-FR'), color: 'text-teal-300'   },
]

const cn = (...c) => c.filter(Boolean).join(' ')

// ══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function AdOptimizerPage({ client }) {
  const [activeTab,   setActiveTab]    = useState('kpis')
  const [data,        setData]         = useState(null)
  const [isLoading,   setIsLoading]    = useState(true)
  const [isCollecting,setIsCollecting] = useState(false)
  const [totalBudget, setTotalBudget]  = useState(5000)

  const loadAnalysis = useCallback(async () => {
    setIsLoading(true)
    try {
      const r = await adOptimizerApi.analyze({
        client_id    : client?.id,
        total_budget : totalBudget,
        run_qlearning: true,
        generate_pdf : true,
      })

      if (r.data.status === 'collecting') {
        toast.info('Collecte en cours… Les données seront disponibles dans quelques minutes.')
        setData(null)
      } else {
        setData(r.data)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de chargement.')
    } finally {
      setIsLoading(false)
    }
  }, [client?.id, totalBudget])

  useEffect(() => { loadAnalysis() }, [loadAnalysis])

  const handleCollect = async () => {
    setIsCollecting(true)
    try {
      await adOptimizerApi.collect()
      toast.success('✅ Collecte Meta Ads + Google Ads lancée ! Retour dans 30s...')
      setTimeout(() => { loadAnalysis(); setIsCollecting(false) }, 30000)
    } catch {
      toast.error('Erreur collecte.')
      setIsCollecting(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* ── En-tête Agent ── */}
      <div className="bg-gradient-to-r from-orange-900/40 to-red-900/40 border border-orange-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">💰</span>
          <div>
            <h2 className="text-xl font-bold text-white">Agent Optimisation Publicitaire</h2>
            <div className="flex flex-wrap gap-2 mt-1">
              {[
                { label: 'XGBoost (CTR, n_estimators=150)',      color: 'bg-orange-500/20 text-orange-300' },
                { label: 'RF + GradientBoosting (segments)',     color: 'bg-red-500/20 text-red-300'      },
                { label: 'SciPy linprog (budget)',               color: 'bg-amber-500/20 text-amber-300'  },
                { label: 'Q-Learning 24 états × 4 actions',     color: 'bg-purple-500/20 text-purple-300' },
                { label: 'Meta Ads API v21',                     color: 'bg-blue-500/20 text-blue-300'    },
                { label: 'Google Ads API GAQL',                  color: 'bg-green-500/20 text-green-300'  },
              ].map(m => (
                <span key={m.label} className={`text-[10px] px-2 py-0.5 rounded-full font-mono border border-white/10 ${m.color}`}>
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">
          Collecte quotidienne Meta Ads API v21 + Google Ads API GAQL →
          XGBoost prédit le CTR → RF/GB classe les segments →
          SciPy linprog réalloue le budget → Q-Learning recommande les enchères →
          5 graphiques + rapport PDF ROI hebdomadaire. ⚠️ Aucun GPU requis.
        </p>
      </div>

      {/* ── Contrôles ── */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <label className="text-xs text-white/50">Budget total :</label>
            <div className="flex items-center gap-1 bg-white/5 border border-white/15 rounded-xl px-3 py-1.5">
              <input
                type="number" value={totalBudget}
                onChange={e => setTotalBudget(parseInt(e.target.value))}
                className="w-24 text-sm text-white bg-transparent outline-none"
              />
              <span className="text-xs text-white/40">€</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleCollect} disabled={isCollecting}
              className="flex items-center gap-1.5 px-3 py-2 border border-orange-500/30 text-orange-300 rounded-xl text-xs hover:bg-orange-500/10 disabled:opacity-50">
              {isCollecting ? (
                <><div className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin" /> Collecte...</>
              ) : (
                <><RefreshCw className="h-3.5 w-3.5" /> Forcer collecte</>
              )}
            </button>
            <button onClick={loadAnalysis} disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs transition-colors disabled:opacity-50">
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              Actualiser
            </button>
          </div>
        </div>

        {data?.last_collected && (
          <p className="text-[10px] text-white/30 mt-2">
            Dernière collecte : {new Date(data.last_collected).toLocaleString('fr-FR')} ·
            Prochaine : quotidienne à minuit (Meta Ads + Google Ads → ao_campaigns)
          </p>
        )}
      </div>

      {/* ── Bandeau mode démo ── */}
      {data?.data_source === 'simulated' && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="text-lg">🧪</span>
          <p className="text-xs text-amber-300">
            {data.demo_message || 'Données de démonstration — aucun compte publicitaire réel connecté.'}
          </p>
        </div>
      )}

      {/* ── Connexion compte publicitaire ── */}
      <ConnectAdAccountPanel client={client} onConnected={loadAnalysis} />

      {/* ── Loading ── */}
      {isLoading && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-16 text-center">
          <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-white/50">Analyse IA en cours…</p>
          <p className="text-xs text-white/30 mt-1">
            XGBoost CTR · RF+GB Segments · SciPy linprog · Q-Learning · 5 graphiques · PDF
          </p>
        </div>
      )}

      {/* ── Première collecte en cours (compte connecté) ── */}
      {!isLoading && !data && (
        <div className="bg-[#1A1A2E] border border-amber-500/20 rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">📡</div>
          <p className="text-sm text-amber-300 font-medium">Première collecte en cours depuis Meta Ads API</p>
          <p className="text-xs text-white/40 mt-2">
            Votre compte publicitaire vient d'être connecté — les métriques arrivent dans quelques minutes.
          </p>
          <button onClick={loadAnalysis} className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm hover:bg-orange-700">
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
                    'flex-1 px-3 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors',
                    activeTab === tab.id
                      ? 'border-orange-500 text-white'
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
              {activeTab === 'kpis'      && <KpisAdPanel      data={data} />}
              {activeTab === 'budget'    && <BudgetOptimPanel data={data} />}
              {activeTab === 'charts'    && <ChartsPanel      data={data} />}
              {activeTab === 'simulator' && <CtrSimulatorPanel client={client} />}
              {activeTab === 'bid'       && <BidAdvisorPanel  />}
              {activeTab === 'reports'   && <ReportAdPanel    data={data} />}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// BADGE SOURCE DES DONNÉES (réel vs simulé)
// ══════════════════════════════════════════════════════════════
function DataSourceBadge({ source }) {
  if (!source) return null
  const isReal = source === 'real'
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-medium border',
      isReal
        ? 'bg-green-500/10 text-green-300 border-green-500/25'
        : 'bg-amber-500/10 text-amber-300 border-amber-500/25'
    )}>
      {isReal ? '📡 Données réelles (vos campagnes)' : '🧪 Données simulées — connectez un compte pour du réel'}
    </span>
  )
}

// ══════════════════════════════════════════════════════════════
// CONNEXION COMPTE PUBLICITAIRE META ADS
// ══════════════════════════════════════════════════════════════
function ConnectAdAccountPanel({ client, onConnected }) {
  const [expanded,   setExpanded]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [pages,      setPages]      = useState([])
  const [socialAccountId, setSocialAccountId] = useState('')
  const [adAccountId,     setAdAccountId]     = useState('')

  const loadOptions = useCallback(async () => {
    setLoading(true)
    try {
      const r = await adOptimizerApi.getConnectableAccounts()
      setPages(r.data.data?.accounts || [])
    } catch (err) {
      console.error('loadOptions error:', err)
      toast.error('Erreur chargement des comptes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (expanded) loadOptions() }, [expanded, loadOptions])

  const selectedPage = pages.find(p => String(p.social_account_id) === String(socialAccountId))

  const handleConnect = async () => {
    if (!socialAccountId || !adAccountId) return
    setSubmitting(true)
    try {
      const adAccount = selectedPage?.ad_accounts?.find(a => a.id === adAccountId)
      await adOptimizerApi.connect({
        social_account_id: Number(socialAccountId),
        ad_account_id    : adAccountId,
        ad_account_name  : adAccount?.name,
        client_id        : client?.id,
      })
      toast.success('✅ Compte publicitaire connecté !')
      setSocialAccountId(''); setAdAccountId(''); setExpanded(false)
      onConnected?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de connexion.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!expanded) {
    return (
      <button onClick={() => setExpanded(true)}
        className="flex items-center gap-2 px-4 py-2.5 border border-orange-500/30 text-orange-300 rounded-xl text-sm hover:bg-orange-500/10 transition-colors">
        <Plus className="h-4 w-4" /> Connecter un compte publicitaire Meta Ads
      </button>
    )
  }

  return (
    <div className="bg-[#1A1A2E] border border-orange-500/20 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Link2 className="h-4 w-4 text-orange-400" /> Connecter un compte publicitaire
        </h3>
        <button onClick={() => setExpanded(false)} className="text-white/30 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : pages.length === 0 ? (
        <p className="text-xs text-white/40">
          Aucun compte Facebook connecté. Connectez d'abord une Page Facebook depuis les paramètres du compte.
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-white/50 mb-1">Page Facebook</label>
            <select value={socialAccountId}
              onChange={e => { setSocialAccountId(e.target.value); setAdAccountId('') }}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm">
              <option value="" className="bg-slate-800">Sélectionner...</option>
              {pages.map(p => (
                <option key={p.social_account_id} value={p.social_account_id} className="bg-slate-800">
                  {p.page_name}
                </option>
              ))}
            </select>
          </div>

          {socialAccountId && (
            <div>
              <label className="block text-xs text-white/50 mb-1">Compte publicitaire Meta Ads</label>
              {selectedPage?.ad_accounts?.length > 0 ? (
                <select value={adAccountId} onChange={e => setAdAccountId(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm">
                  <option value="" className="bg-slate-800">Sélectionner...</option>
                  {selectedPage.ad_accounts.map(a => (
                    <option key={a.id} value={a.id} className="bg-slate-800">
                      {a.name} ({a.id})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-red-300/70">
                  Aucun compte publicitaire trouvé pour cette Page — vérifiez la permission "ads_read" ou reconnectez le compte.
                </p>
              )}
            </div>
          )}

          <button onClick={handleConnect} disabled={!socialAccountId || !adAccountId || submitting}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors">
            {submitting ? 'Connexion...' : 'Connecter'}
          </button>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 1 — KPIs
// ══════════════════════════════════════════════════════════════
function KpisAdPanel({ data }) {
  const meta  = data?.metadata          || {}
  const cmpns = data?.campaign_metrics  || []
  const under = data?.underperforming   || []
  const seg   = data?.segment_result   || null

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPI_CARDS.map(card => (
          <div key={card.key} className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{card.icon}</span>
              <p className="text-xs text-white/40 font-medium">{card.label}</p>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>
              {card.fmt(meta[card.key]) ?? '—'}
            </p>
          </div>
        ))}

        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">⚠️</span>
            <p className="text-xs text-red-300/60 font-medium">Sous-performants</p>
          </div>
          <p className="text-2xl font-bold text-red-300">{meta.underperforming || 0}</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔥</span>
            <p className="text-xs text-amber-300/60 font-medium">Top Performers</p>
          </div>
          <p className="text-2xl font-bold text-amber-300">{meta.top_performers || 0}</p>
        </div>
      </div>

      {/* Tableau campagnes */}
      {cmpns.length > 0 && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5 overflow-x-auto">
          <h3 className="text-sm font-semibold text-white mb-4">📈 Performance par Campagne</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {["Campagne","Budget €","Revenus €","ROAS","CTR%","CPA €","Statut"].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs text-white/40 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cmpns.map((c, i) => {
                const roas = c.actual_roas || 0
                const roasColor = roas >= 3 ? 'text-green-300' : roas >= 1 ? 'text-amber-300' : 'text-red-300'
                return (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                    <td className="py-2 px-3 font-medium text-white">{c.campaign_name}</td>
                    <td className="py-2 px-3 text-white/60">{c.total_spend?.toFixed(2)}</td>
                    <td className="py-2 px-3 text-white/60">{c.total_revenue?.toFixed(2)}</td>
                    <td className={`py-2 px-3 font-bold ${roasColor}`}>{roas.toFixed(2)}x</td>
                    <td className="py-2 px-3 text-white/60">{c.avg_ctr?.toFixed(3)}%</td>
                    <td className="py-2 px-3 text-white/60">{c.avg_cpa?.toFixed(2)}</td>
                    <td className="py-2 px-3">
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-medium',
                        roas >= 2 ? 'bg-green-500/15 text-green-300' :
                        roas >= 1 ? 'bg-amber-500/15 text-amber-300' :
                        'bg-red-500/15 text-red-300'
                      )}>
                        {roas >= 2 ? '🔥 Top' : roas >= 1 ? '✅ OK' : '❌ Faible'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sous-performants */}
      {under.length > 0 && (
        <div className="bg-[#1A1A2E] border border-red-500/20 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-red-300 mb-4">⚠️ Publicités Sous-Performantes à Signaler</h3>
          <div className="space-y-3">
            {under.map((u, i) => (
              <div key={i} className="p-3 bg-red-500/10 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-red-400">{u.priorite}</span>
                  <span className="text-sm font-medium text-white">{u.campaign_name}</span>
                  <span className="text-xs text-white/40">{u.platform}</span>
                </div>
                <p className="text-xs text-white/50">
                  CTR: {u.ctr?.toFixed(3)}% · ROAS: {u.roas?.toFixed(2)}x · Dépense: {u.spend?.toFixed(2)}€
                </p>
                <p className="text-xs text-orange-300 mt-1">💡 {u.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top segments audience (RF/GB) */}
      {seg?.top_segments?.length > 0 && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-2">
            🎯 Top Segments Audience — {seg.best_name}
          </h3>
          <p className="text-xs text-white/40 mb-4">
            Accuracy : {seg.accuracy?.toFixed(3)} | RF : {seg.rf_accuracy?.toFixed(3)} | GB : {seg.gb_accuracy?.toFixed(3)}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {["Âge","Genre","Plateforme","ROAS moy.","CTR moy.","Nb camps."].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs text-white/40">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seg.top_segments.map((s, i) => (
                  <tr key={i} className="border-b border-white/5 bg-green-500/5">
                    <td className="py-2 px-3 text-white">{s.audience_age}</td>
                    <td className="py-2 px-3 text-white/60">{s.audience_gender}</td>
                    <td className="py-2 px-3 text-white/60">{s.platform}</td>
                    <td className="py-2 px-3 font-bold text-green-300">{s.avg_roas?.toFixed(2)}x</td>
                    <td className="py-2 px-3 text-white/60">{s.avg_ctr?.toFixed(3)}%</td>
                    <td className="py-2 px-3 text-white/60">{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 2 — BUDGET SCIPY linprog
// ══════════════════════════════════════════════════════════════
function BudgetOptimPanel({ data }) {
  const opt    = data?.opt_result || null
  const charts = data?.charts    || {}

  if (!opt) {
    return (
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-12 text-center text-white/20">
        <div className="text-3xl mb-2">💰</div>
        <p className="text-sm">Optimisation non disponible — minimum 2 campagnes requises</p>
      </div>
    )
  }

  const improvement = opt.improvement_pct || 0
  const isPositive  = improvement >= 0

  return (
    <div className="space-y-5">
      {/* Résumé ROAS */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5 text-center">
          <p className="text-xs text-white/40 mb-1">ROAS Avant</p>
          <p className="text-3xl font-bold text-orange-300">{opt.roas_before?.toFixed(2)}x</p>
          <p className="text-[10px] text-white/30 mt-1">Allocation actuelle</p>
        </div>
        <div className={cn(
          'rounded-2xl border p-5 text-center',
          isPositive ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
        )}>
          <p className="text-xs text-white/40 mb-1">Amélioration</p>
          <p className={`text-3xl font-bold ${isPositive ? 'text-green-300' : 'text-red-300'}`}>
            {isPositive ? '+' : ''}{improvement?.toFixed(1)}%
          </p>
          <p className="text-[10px] text-white/30 mt-1">
            SciPy linprog · {opt.scipy_success ? '✅ Convergé' : '⚡ Fallback'}
          </p>
        </div>
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5 text-center">
          <p className="text-xs text-white/40 mb-1">ROAS Après Optimisation</p>
          <p className="text-3xl font-bold text-green-300">{opt.roas_after?.toFixed(2)}x</p>
          <p className="text-[10px] text-white/30 mt-1">Budget total : {opt.total_budget?.toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      {/* Graphique */}
      {charts.budget && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">📊 Budget Actuel vs Optimisé</h3>
          <p className="text-xs text-white/30 mb-4">SciPy linprog — maximise ROAS total sous contrainte budget</p>
          <img src={`data:image/png;base64,${charts.budget}`} alt="Budget" className="w-full rounded-xl" />
        </div>
      )}

      {/* Tableau allocation */}
      {opt.allocation?.length > 0 && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5 overflow-x-auto">
          <h3 className="text-sm font-semibold text-white mb-4">📋 Plan de Réallocation</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {["Campagne","ROAS","Budget actuel","Budget optimal","Variation","Action"].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs text-white/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {opt.allocation.map((row, i) => {
                const variation = row.variation_eur || 0
                return (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-2 px-3 font-medium text-white">{row.campaign_name}</td>
                    <td className="py-2 px-3 font-bold text-indigo-300">{row.actual_roas?.toFixed(2)}x</td>
                    <td className="py-2 px-3 text-white/60">{row.budget_actuel_eur?.toFixed(2)} €</td>
                    <td className="py-2 px-3 font-semibold text-white">{row.budget_optimal_eur?.toFixed(2)} €</td>
                    <td className={cn('py-2 px-3 font-semibold', variation >= 0 ? 'text-green-300' : 'text-red-300')}>
                      {variation >= 0 ? '+' : ''}{variation?.toFixed(2)} €
                    </td>
                    <td className="py-2 px-3">
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-medium',
                        row.action?.includes('Augmenter') ? 'bg-green-500/15 text-green-300' :
                        row.action?.includes('Réduire')   ? 'bg-red-500/15 text-red-300'     :
                        'bg-white/10 text-white/40'
                      )}>
                        {row.action}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 3 — GRAPHIQUES (5 Matplotlib + Seaborn)
// ══════════════════════════════════════════════════════════════
function ChartsPanel({ data }) {
  const [activeChart, setActiveChart] = useState('roas')
  const charts = data?.charts || {}

  const CHART_TABS = [
    { key: 'roas',        label: '💰 ROAS'      },
    { key: 'scatter',     label: '📈 CTR/ROAS'  },
    { key: 'budget',      label: '💡 Budget'    },
    { key: 'qlearning',   label: '🎮 Q-Learning'},
    { key: 'heatmap_ctr', label: '🗺️ Heatmap'  },
  ]

  const chartDescriptions = {
    roas       : "ROAS par campagne — seuil rentabilité 1x (rouge) et cible 3x (vert)",
    scatter    : "CTR vs ROAS — quadrants de performance (Top Performers en haut à droite)",
    budget     : "Budget actuel vs optimisé SciPy linprog — variation en €",
    qlearning  : "Convergence Q-Learning (récompenses) + heatmap Q-table",
    heatmap_ctr: "CTR moyen par tranche d'âge × genre",
  }

  return (
    <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-1">📈 Graphiques Analytiques</h3>
      <p className="text-xs text-white/30 mb-4">Générés par Matplotlib + Seaborn · Données Meta Ads API + Google Ads</p>

      <div className="flex gap-2 flex-wrap mb-5">
        {CHART_TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveChart(tab.key)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
              activeChart === tab.key
                ? 'bg-orange-600 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            )}>
            {tab.label}
          </button>
        ))}
      </div>

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

      {chartDescriptions[activeChart] && (
        <p className="mt-3 text-xs text-white/30 text-center">{chartDescriptions[activeChart]}</p>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 4 — SIMULATEUR CTR (XGBoost)
// ══════════════════════════════════════════════════════════════
function CtrSimulatorPanel({ client }) {
  const [adType,      setAdType]     = useState('Vidéo')
  const [platform,    setPlatform]   = useState('Meta')
  const [age,         setAge]        = useState('25-34')
  const [gender,      setGender]     = useState('All')
  const [spend,       setSpend]      = useState(200)
  const [impressions, setImpressions]= useState(10000)
  const [dayOfWeek,   setDay]        = useState(2)
  const [result,      setResult]     = useState(null)
  const [loading,     setLoading]    = useState(false)

  const handlePredict = async () => {
    setLoading(true)
    try {
      const r = await adOptimizerApi.predictCTR({
        ad_type              : adType,
        platform, age, gender,
        estimated_spend      : spend,
        estimated_impressions: impressions,
        day_of_week          : dayOfWeek,
      })
      setResult(r.data)
    } catch { toast.error('Erreur prédiction CTR.') }
    finally { setLoading(false) }
  }

  const scoreColor = result
    ? (result.ctr_predicted >= result.benchmark * 1.5 ? 'text-green-300 bg-green-500/10 border-green-500/30' :
       result.ctr_predicted >= result.benchmark       ? 'text-blue-300 bg-blue-500/10 border-blue-500/30'   :
       result.ctr_predicted >= result.benchmark * 0.6 ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' :
       'text-red-300 bg-red-500/10 border-red-500/30')
    : ''

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Configurateur */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-1">🖱️ Simulateur CTR — XGBoost</h3>
        <p className="text-xs text-white/30 mb-5">
          n_estimators=150 · max_depth=5 · Prédisez avant de dépenser
        </p>

        <div className="space-y-4">
          {/* Type d'annonce */}
          <div>
            <label className="block text-xs text-white/50 mb-2">Type d'annonce</label>
            <div className="flex flex-wrap gap-2">
              {AD_TYPES.map(t => (
                <button key={t} type="button" onClick={() => setAdType(t)}
                  className={cn('px-3 py-1.5 rounded-full text-xs border transition-colors',
                    adType === t ? 'bg-orange-600 text-white border-orange-600' : 'border-white/15 text-white/50 hover:border-orange-500/50'
                  )}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Plateforme */}
          <div>
            <label className="block text-xs text-white/50 mb-2">Plateforme</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button key={p} type="button" onClick={() => setPlatform(p)}
                  className={cn('px-3 py-1.5 rounded-full text-xs border transition-colors',
                    platform === p ? 'bg-orange-600 text-white border-orange-600' : 'border-white/15 text-white/50 hover:border-orange-500/50'
                  )}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Âge cible</label>
              <select value={age} onChange={e => setAge(e.target.value)}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                {AGES.map(a => <option key={a} className="bg-slate-800">{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Genre</label>
              <select value={gender} onChange={e => setGender(e.target.value)}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                {GENDERS.map(g => <option key={g} className="bg-slate-800">{g}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Budget : {spend} €</label>
            <input type="range" min={50} max={2000} step={50} value={spend}
              onChange={e => setSpend(parseInt(e.target.value))}
              className="w-full accent-orange-500" />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">
              Impressions : {impressions.toLocaleString('fr-FR')}
            </label>
            <input type="range" min={1000} max={100000} step={1000} value={impressions}
              onChange={e => setImpressions(parseInt(e.target.value))}
              className="w-full accent-orange-500" />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">
              Jour : {DAYS_FR[dayOfWeek]}
            </label>
            <input type="range" min={0} max={6} value={dayOfWeek}
              onChange={e => setDay(parseInt(e.target.value))}
              className="w-full accent-orange-500" />
          </div>

          <button onClick={handlePredict} disabled={loading}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Prédiction XGBoost...</>
            ) : (
              <>🖱️ Prédire le CTR</>
            )}
          </button>
        </div>
      </div>

      {/* Résultat */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">📊 Résultat XGBoost</h3>

        {result ? (
          <div className="space-y-4">
            <DataSourceBadge source={result.data_source} />
            <div className={cn('p-5 rounded-xl border-2', scoreColor)}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">CTR Prédit</span>
                <span className="text-3xl font-black">{result.ctr_predicted}%</span>
              </div>
              <p className="text-sm font-medium">{result.evaluation}</p>
              <div className="mt-3 pt-3 border-t border-current border-opacity-20 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="opacity-60">Benchmark {platform}</p>
                  <p className="font-bold">{result.benchmark}%</p>
                </div>
                <div>
                  <p className="opacity-60">Clics projetés</p>
                  <p className="font-bold">{result.projected_clicks?.toLocaleString('fr-FR')}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-xs font-semibold text-white/50 mb-2">Configuration analysée</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-white/60">
                <span>📱 {result.config?.platform}</span>
                <span>🎨 {result.config?.ad_type}</span>
                <span>👥 {result.config?.age} · {result.config?.gender}</span>
                <span>💰 {result.config?.spend} € | {result.config?.impressions?.toLocaleString('fr-FR')} imp.</span>
              </div>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/15 rounded-xl">
              <p className="text-xs text-blue-300">
                💡 CPM estimé : {((spend / impressions) * 1000).toFixed(2)} €/1000 ·
                CPC projeté : {result.projected_clicks > 0 ? (spend / result.projected_clicks).toFixed(3) : 'N/A'} €
              </p>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-white/20 border-2 border-dashed border-white/10 rounded-xl">
            <div className="text-center">
              <p className="text-4xl mb-2">🖱️</p>
              <p className="text-sm">Configurez et lancez la prédiction</p>
              <p className="text-xs mt-1">XGBoost entraîné sur vos données campagnes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 5 — ENCHÈRES Q-LEARNING
// ══════════════════════════════════════════════════════════════
function BidAdvisorPanel() {
  const [perfScore, setPerfScore] = useState(50)
  const [budgetRem, setBudgetRem] = useState(60)
  const [isWeekend, setWeekend]   = useState(false)
  const [currentBid,setBid]       = useState(0.80)
  const [result,    setResult]    = useState(null)
  const [loading,   setLoading]   = useState(false)

  const handleRecommend = async () => {
    setLoading(true)
    try {
      const r = await adOptimizerApi.bidRecommend({
        performance_score    : perfScore,
        budget_remaining_pct : budgetRem,
        is_weekend           : isWeekend,
        current_bid          : currentBid,
      })
      setResult(r.data)
    } catch { toast.error('Erreur Q-Learning.') }
    finally { setLoading(false) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Config */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-1">🎮 Conseiller Enchères Q-Learning</h3>
        <p className="text-xs text-white/30 mb-5">
          24 états × 4 actions · Équation de Bellman · α=0.1 · γ=0.95
        </p>

        <div className="space-y-5">
          <div>
            <label className="flex justify-between text-xs text-white/50 mb-2">
              <span>Score de performance</span>
              <span className={cn('font-bold',
                perfScore >= 66 ? 'text-green-300' : perfScore >= 33 ? 'text-amber-300' : 'text-red-300'
              )}>
                {perfScore}/100 — {perfScore >= 66 ? '🔥 Fort' : perfScore >= 33 ? '⚡ Moyen' : '❌ Faible'}
              </span>
            </label>
            <input type="range" min={0} max={100} value={perfScore}
              onChange={e => setPerfScore(parseInt(e.target.value))}
              className="w-full accent-orange-500" />
          </div>

          <div>
            <label className="flex justify-between text-xs text-white/50 mb-2">
              <span>Budget restant</span>
              <span className="font-bold text-white">{budgetRem}%</span>
            </label>
            <input type="range" min={0} max={100} value={budgetRem}
              onChange={e => setBudgetRem(parseInt(e.target.value))}
              className="w-full accent-orange-500" />
          </div>

          <div>
            <label className="flex justify-between text-xs text-white/50 mb-2">
              <span>Enchère actuelle</span>
              <span className="font-bold text-white">{currentBid.toFixed(2)} €</span>
            </label>
            <input type="range" min={0.1} max={5} step={0.05} value={currentBid}
              onChange={e => setBid(parseFloat(e.target.value))}
              className="w-full accent-orange-500" />
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setWeekend(!isWeekend)}
              className={cn('relative w-12 h-6 rounded-full transition-colors', isWeekend ? 'bg-orange-600' : 'bg-white/20')}>
              <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                isWeekend ? 'translate-x-6' : 'translate-x-1')} />
            </button>
            <span className="text-xs text-white/50">
              {isWeekend ? '🎉 Weekend (samedi/dimanche)' : '💼 Semaine'}
            </span>
          </div>

          <button onClick={handleRecommend} disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Q-Learning...</>
            ) : (
              <>🎮 Recommander l'enchère</>
            )}
          </button>
        </div>
      </div>

      {/* Résultat */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">📊 Recommandation Q-Learning</h3>

        {result ? (
          <div className="space-y-4">
            <DataSourceBadge source={result.data_source} />
            {/* Action recommandée */}
            <div className="p-5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
              <p className="text-lg font-bold text-purple-300">{result.recommended_action}</p>
              <div className="flex items-center justify-center gap-4 mt-3 text-sm">
                <div>
                  <p className="text-xs text-white/40">Enchère actuelle</p>
                  <p className="font-bold text-white">{result.current_bid} €</p>
                </div>
                <span className="text-white/30 text-2xl">→</span>
                <div>
                  <p className="text-xs text-white/40">Enchère recommandée</p>
                  <p className="font-bold text-purple-300 text-xl">{result.recommended_bid} €</p>
                </div>
              </div>
              {result.bid_change_pct !== 0 && (
                <p className={cn(
                  'text-xs font-semibold mt-2',
                  result.bid_change_pct > 0 ? 'text-green-300' : 'text-red-300'
                )}>
                  {result.bid_change_pct > 0 ? '+' : ''}{result.bid_change_pct}% variation
                </p>
              )}
            </div>

            {/* Q-values */}
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs font-semibold text-white/50 mb-3">
                Q-Values (état #{result.state_id}) · Confiance : {result.confidence?.toFixed(3)}
              </p>
              <div className="space-y-2">
                {result.q_values && Object.entries(result.q_values).map(([action, value]) => (
                  <div key={action} className="flex items-center gap-3">
                    <span className="text-xs text-white/50 w-24 flex-shrink-0">{action}</span>
                    <div className="flex-1 bg-white/10 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, value * 10))}%` }} />
                    </div>
                    <span className="text-xs text-purple-300 font-mono w-12 text-right">{value.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-white/20 border-2 border-dashed border-white/10 rounded-xl">
            <div className="text-center">
              <p className="text-4xl mb-2">🎮</p>
              <p className="text-sm">Configurez et demandez la recommandation</p>
              <p className="text-xs mt-1">Q-Learning 24 états × 4 actions · Équation de Bellman</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 6 — RAPPORTS PDF ROI
// ══════════════════════════════════════════════════════════════
function ReportAdPanel({ data }) {
  const [reports,     setReports]     = useState([])
  const [isLoading,   setIsLoading]   = useState(true)
  const [downloading, setDownloading] = useState(null)
  const qResult = data?.q_result

  useEffect(() => {
    adOptimizerApi.getReports()
      .then(r => setReports(r.data.data?.reports || []))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const handleDownload = async (report) => {
    setDownloading(report.id)
    try {
      const r   = await adOptimizerApi.downloadReport(report.id)
      const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      const a   = document.createElement('a')
      a.href     = url
      a.download = `rapport_roi_${report.period_start}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('📥 Rapport ROI téléchargé !')
    } catch { toast.error('Erreur téléchargement.') }
    finally { setDownloading(null) }
  }

  return (
    <div className="space-y-5">

      {/* PDF du dashboard courant */}
      {data?.pdf_url && (
        <div className="bg-[#1A1A2E] border border-orange-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">📄 Rapport ROI Hebdomadaire Disponible</h3>
              <p className="text-xs text-white/40 mt-1">
                ReportLab · Meta Ads API v21 + Google Ads · XGBoost + SciPy + Q-Learning
              </p>
              <p className="text-[10px] text-white/25 mt-0.5">
                ROAS · SciPy budget · Sous-performants · Q-Learning · Segments RF/GB
              </p>
            </div>
            <a href={data.pdf_url} download
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm transition-colors">
              <Download className="h-4 w-4" />
              Télécharger PDF
            </a>
          </div>
        </div>
      )}

      {/* Q-Learning info */}
      {qResult && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
          <p className="text-sm font-semibold text-purple-300 mb-1">🎮 Q-Learning Convergence</p>
          <p className="text-xs text-purple-300/60">
            {qResult.n_episodes} épisodes · α={qResult.alpha} · γ={qResult.gamma} ·
            Récompense moyenne : {qResult.avg_reward?.toFixed(2)}
          </p>
        </div>
      )}

      {/* Historique ao_reports */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">📋 Historique des Rapports ROI (ao_reports)</h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-10 text-white/20">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-sm">Aucun rapport disponible</p>
            <p className="text-xs mt-1">Les rapports sont générés automatiquement chaque lundi à 8h</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => (
              <div key={report.id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/8 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Semaine du {new Date(report.period_start).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-xs text-white/40">
                      ROAS {report.roas_before?.toFixed(2)}x → {report.roas_after?.toFixed(2)}x
                      {report.roas_improvement_pct && (
                        <span className="ml-1 text-green-300 font-semibold">
                          (+{report.roas_improvement_pct?.toFixed(1)}%)
                        </span>
                      )}
                      {report.client?.name && <> · {report.client.name}</>}
                    </p>
                  </div>
                </div>
                {report.pdf_url && (
                  <button onClick={() => handleDownload(report)}
                    disabled={downloading === report.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600/20 text-orange-300 hover:bg-orange-600/30 rounded-lg text-xs transition-colors disabled:opacity-50">
                    {downloading === report.id ? (
                      <><div className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin" /> ...</>
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

      {/* Info collecte */}
      <div className="bg-orange-500/5 border border-orange-500/15 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-orange-300 mb-2">ℹ️ Collecte automatique</h4>
        <div className="text-xs text-orange-300/60 space-y-1">
          <p>• Collecte <strong>quotidienne à minuit</strong> via Laravel Scheduler → table <code>ao_campaigns</code></p>
          <p>• Source 1 : <strong>Meta Ads API v21</strong> — campagnes + insights + ad sets (act_xxxxxxxxx)</p>
          <p>• Source 2 : <strong>Google Ads API</strong> — GAQL SELECT campaign.id, metrics.* DURING LAST_7_DAYS</p>
          <p>• Source 3 : <strong>Playwright</strong> — scraping complémentaire données publicitaires publiques</p>
          <p>• Rapport ROI PDF généré automatiquement <strong>chaque lundi à 8h</strong> → table <code>ao_reports</code></p>
          <p>• ⚠️ Aucun GPU requis — XGBoost + Scikit-learn + SciPy + Q-Learning (NumPy) — 100% CPU</p>
        </div>
      </div>
    </div>
  )
}