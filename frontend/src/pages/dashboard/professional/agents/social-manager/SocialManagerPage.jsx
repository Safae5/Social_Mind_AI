// SocialManagerPage.jsx
// Agent Gestionnaire de Réseaux Sociaux — Dashboard Professionnel Social Mind AI
// Prophet · Twitter-RoBERTa (cardinfnlp) · Mistral 7B · Meta Graph API v21
// Thème sombre cohérent avec le dashboard professionnel (#0F0F1A)

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Plus, Send, ChevronDown, Trash2, Clock, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { socialManagerApi } from '@/api/socialManagerApi'
import { professionalApi } from '@/api/professionalApi'

// ── Configuration sentiment ────────────────────────────────────
const SENTIMENT_CONFIG = {
  POSITIVE: { color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-l-green-400',  emoji: '😊', label: 'Positif' },
  NEUTRAL : { color: 'text-white/50',   bg: 'bg-white/5',       border: 'border-l-white/20',   emoji: '😐', label: 'Neutre'  },
  NEGATIVE: { color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-l-red-400',    emoji: '😠', label: 'Négatif' },
}

const PRIORITY_DOT = {
  high  : 'bg-red-400',
  medium: 'bg-amber-400',
  low   : 'bg-green-400',
}

const STATUS_COLORS = {
  scheduled: 'bg-amber-400/10 text-amber-400',
  published : 'bg-green-400/10 text-green-400',
  failed    : 'bg-red-400/10 text-red-400',
  draft     : 'bg-white/10 text-white/40',
}

const PLATFORM_EMOJIS = {
  facebook : '👥',
  instagram: '📸',
  tiktok   : '🎵',
  linkedin : '💼',
}

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

const cn = (...c) => c.filter(Boolean).join(' ')

// ══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function SocialManagerPage({ client }) {
  const [activeTab,       setActiveTab]       = useState('calendar')
  const [accounts,        setAccounts]        = useState([])
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [inboxUnread,     setInboxUnread]     = useState(0)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)

  // ── Chargement des comptes ─────────────────────────────────
  const loadAccounts = useCallback(() => {
    setIsLoadingAccounts(true)
    return socialManagerApi.getAccounts()
      .then(r => {
        const accs = r.data.data?.accounts || []
        setAccounts(accs)
        setSelectedAccount(prev => prev ?? (accs.length > 0 ? accs[0] : null))
      })
      .catch(() => toast.error('Erreur chargement comptes sociaux.'))
      .finally(() => setIsLoadingAccounts(false))
  }, [])

  useEffect(() => {
    loadAccounts()

    // Polling badge inbox toutes les 30s
    const timer = setInterval(async () => {
      try {
        const r = await socialManagerApi.getInbox({ status: 'pending' })
        setInboxUnread(r.data.data?.stats?.unread || 0)
      } catch {}
    }, 30000)
    return () => clearInterval(timer)
  }, [loadAccounts])

  const TABS = [
    { id: 'calendar', label: '📅 Créneaux Prophet' },
    { id: 'queue',    label: '📤 File d\'attente'  },
    { id: 'inbox',    label: '💬 Inbox', badge: inboxUnread },
    { id: 'metrics',  label: '📊 Métriques'        },
  ]

  return (
    <div className="space-y-6">

      {/* ── En-tête Agent ── */}
      <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border border-blue-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">📱</span>
          <div>
            <h2 className="text-xl font-bold text-white">Agent Gestionnaire de Réseaux Sociaux</h2>
            <div className="flex flex-wrap gap-2 mt-1">
              {[
                { label: 'Prophet (créneaux)',                              color: 'bg-blue-500/20 text-blue-300'    },
                { label: 'cardinfnlp/twitter-roberta (sentiment)',         color: 'bg-purple-500/20 text-purple-300' },
                { label: 'mistralai/Mistral-7B-Instruct-v0.3 (réponses)', color: 'bg-indigo-500/20 text-indigo-300' },
                { label: 'Meta Graph API v21',                             color: 'bg-green-500/20 text-green-300'  },
                { label: 'Playwright (scraping)',                          color: 'bg-amber-500/20 text-amber-300'  },
              ].map(m => (
                <span key={m.label} className={`text-[10px] px-2 py-0.5 rounded-full font-mono border border-white/10 ${m.color}`}>
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">
          Planification multi-comptes avec créneaux optimaux Prophet · Surveillance commentaires
          toutes les 15 min via Meta Graph API · Classification sentiment Twitter-RoBERTa ·
          Réponses IA Mistral 7B avec workflow d'approbation · Publication directe Meta Graph API.
        </p>
      </div>

      {/* ── Sélecteur de compte ── */}
      {!isLoadingAccounts && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm font-medium text-white/70">Compte social actif</p>
            <div className="flex gap-2 flex-wrap items-center">
              {accounts.map(account => (
                <button
                  key={account.id}
                  onClick={() => setSelectedAccount(account)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-all',
                    selectedAccount?.id === account.id
                      ? 'border-blue-500 bg-blue-500/20 text-white'
                      : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30'
                  )}
                >
                  <span>{PLATFORM_EMOJIS[account.platform] || '📱'}</span>
                  <span>{account.account_name}</span>
                </button>
              ))}
              <ConnectAccountPanel onConnected={loadAccounts} />
            </div>
          </div>
          {accounts.length === 0 && (
            <p className="text-xs text-amber-300 mt-3">
              ⚠️ Aucun compte connecté pour l'instant — connectez un compte ci-dessus pour l'assigner à un client.
            </p>
          )}
        </div>
      )}

      {/* ── Navigation onglets ── */}
      <div className="bg-[#141420] border border-white/5 rounded-xl">
        <div className="flex overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors relative',
                activeTab === tab.id
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-white/40 hover:text-white/70'
              )}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu des onglets ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'calendar' && <CalendarView  account={selectedAccount} />}
          {activeTab === 'queue'    && <ContentQueueView account={selectedAccount} accounts={accounts} />}
          {activeTab === 'inbox'    && <CommentInboxView account={selectedAccount} />}
          {activeTab === 'metrics'  && <MetricsView   account={selectedAccount} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ASSIGNER UN COMPTE SOCIAL DÉJÀ LIÉ (OAuth) À UN CLIENT
// ══════════════════════════════════════════════════════════════
function ConnectAccountPanel({ onConnected }) {
  const [isOpen,       setIsOpen]       = useState(false)
  const [connectable,  setConnectable]  = useState([])
  const [clients,      setClients]      = useState([])
  const [socialAccountId, setSocialAccountId] = useState('')
  const [clientId,     setClientId]     = useState('')
  const [isLoading,    setIsLoading]    = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isAuthorizing,setIsAuthorizing]= useState(false)

  const handleAuthorizeMeta = async () => {
    setIsAuthorizing(true)
    try {
      const r = await socialManagerApi.getMetaAuthUrl()
      window.location.href = r.data.auth_url
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la connexion Meta.')
      setIsAuthorizing(false)
    }
  }

  const loadOptions = useCallback(async () => {
    setIsLoading(true)
    try {
      const [accRes, clientRes] = await Promise.all([
        socialManagerApi.getConnectableAccounts(),
        professionalApi.getClients({ per_page: 100 }),
      ])
      setConnectable(accRes.data.data?.accounts || [])
      setClients(clientRes.data.data?.data || [])
    } catch (err) {
      console.error('loadOptions error:', err)
      toast.error('Erreur chargement des comptes/clients.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { if (isOpen) loadOptions() }, [isOpen, loadOptions])

  const handleConnect = async (e) => {
    e.preventDefault()
    if (!socialAccountId || !clientId) {
      toast.error('Sélectionnez un compte et un client.')
      return
    }
    setIsConnecting(true)
    try {
      await socialManagerApi.connect({ social_account_id: socialAccountId, client_id: clientId })
      toast.success('✅ Compte connecté au client !')
      setIsOpen(false)
      setSocialAccountId('')
      setClientId('')
      onConnected?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de connexion du compte.')
    } finally {
      setIsConnecting(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Connecter un compte
      </button>
    )
  }

  return (
    <motion.form
      onSubmit={handleConnect}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-white/5 border border-white/10 rounded-xl p-4"
    >
      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Compte social lié</label>
              <select
                value={socialAccountId}
                onChange={e => setSocialAccountId(e.target.value)}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
              >
                <option value="" className="bg-slate-800">Sélectionner...</option>
                {connectable.map(a => (
                  <option key={a.id} value={a.id} className="bg-slate-800">
                    {PLATFORM_EMOJIS[a.platform] || '📱'} {a.account_name || a.account_handle}
                  </option>
                ))}
              </select>
              {connectable.length === 0 && (
                <div className="mt-1.5 p-2.5 bg-amber-500/5 border border-amber-500/15 rounded-lg">
                  <p className="text-[11px] text-amber-300/70 mb-1.5">
                    Aucun compte Instagram/Facebook lié pour l'instant.
                  </p>
                  <button
                    type="button"
                    onClick={handleAuthorizeMeta}
                    disabled={isAuthorizing}
                    className="text-[11px] font-medium px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isAuthorizing ? 'Redirection...' : '📸 Connecter mon compte Meta'}
                  </button>
                </div>
              )}
              {connectable.length > 0 && (
                <button
                  type="button"
                  onClick={handleAuthorizeMeta}
                  disabled={isAuthorizing}
                  className="text-[11px] text-blue-400 hover:text-blue-300 mt-1 disabled:opacity-50"
                >
                  {isAuthorizing ? 'Redirection...' : '+ Lier un autre compte Meta'}
                </button>
              )}
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Client</label>
              <select
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
              >
                <option value="" className="bg-slate-800">Sélectionner...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-800">
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isConnecting}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {isConnecting ? 'Connexion...' : 'Connecter'}
            </button>
            <button type="button" onClick={() => setIsOpen(false)}
              className="px-4 py-2 border border-white/10 text-white/50 rounded-xl text-sm hover:bg-white/5">
              Annuler
            </button>
          </div>
        </div>
      )}
    </motion.form>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 1 — CALENDRIER CRÉNEAUX PROPHET
// ══════════════════════════════════════════════════════════════
function CalendarView({ account }) {
  const [slots,      setSlots]     = useState([])
  const [bestDays,   setBestDays]  = useState([])
  const [bestHours,  setBestHours] = useState([])
  const [isLoading,  setIsLoading] = useState(false)
  const [dataPoints, setDataPoints]= useState(0)
  const [modelTrained, setModelTrained] = useState(false)

  const loadSlots = useCallback(async () => {
    if (!account?.id) return
    setIsLoading(true)
    try {
      const r = await socialManagerApi.getOptimalSlots(account.id)
      const d = r.data.data
      setSlots(d.slots || [])
      setBestDays(d.best_days || [])
      setBestHours(d.best_hours || [])
      setDataPoints(d.data_points || 0)
      setModelTrained(d.model_trained || false)
    } catch {
      toast.error('Erreur chargement créneaux Prophet.')
    } finally {
      setIsLoading(false)
    }
  }, [account?.id])

  useEffect(() => { loadSlots() }, [loadSlots])

  if (!account) {
    return (
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-12 text-center text-white/20">
        <div className="text-4xl mb-3">📱</div>
        <p className="text-sm">Aucun compte social connecté.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              📅 Créneaux Optimaux — 7 Prochains Jours
              <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/20">
                {modelTrained ? `🔮 Prophet (${dataPoints} pts)` : '⚙️ Heuristique'}
              </span>
            </h3>
            <p className="text-xs text-white/40 mt-0.5">
              {account.account_name} ({account.platform}) · Meta Graph API v21
            </p>
          </div>
          <button
            onClick={loadSlots}
            disabled={isLoading}
            className="p-2 text-white/30 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 gap-3">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm text-white/50">🔮 Prophet analyse l'historique Meta Graph API (90 jours)...</p>
          </div>
        ) : (
          <>
            {/* Grille 7 créneaux */}
            <div className="grid grid-cols-7 gap-3">
              {slots.map((slot, i) => {
                const dt      = new Date(slot.datetime || slot.slot_datetime)
                const dayIdx  = dt.getDay()
                const dayName = DAYS_FR[dayIdx]
                const dateStr = dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                const hour    = dt.getHours()
                const score   = slot.predicted_score ?? slot.predicted_engagement ?? 0

                return (
                  <div key={i}
                    className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 text-center hover:bg-blue-500/15 transition-colors">
                    <p className="text-xs font-bold text-blue-300">{dayName}</p>
                    <p className="text-[10px] text-white/40 mb-1">{dateStr}</p>
                    <p className="text-2xl font-bold text-white">{String(hour).padStart(2, '0')}h</p>
                    {score > 0 && (
                      <p className="text-[10px] text-blue-400 mt-1">Score : {score.toFixed(1)}</p>
                    )}
                    <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full mt-2 inline-block">
                      🔮 Optimal
                    </span>
                  </div>
                )
              })}
              {slots.length === 0 && (
                <div className="col-span-7 text-center py-8 text-white/20 text-sm">
                  Aucun créneau disponible. Recalcul en cours...
                </div>
              )}
            </div>

            {/* Best days / hours */}
            {(bestDays.length > 0 || bestHours.length > 0) && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs font-semibold text-white/50 mb-2">🏆 Meilleurs jours</p>
                  <div className="flex flex-wrap gap-1">
                    {bestDays.slice(0, 3).map((day, i) => (
                      <span key={i} className={cn(
                        'text-xs px-2.5 py-1 rounded-full',
                        i === 0 ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60'
                      )}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {day}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs font-semibold text-white/50 mb-2">⏰ Meilleures heures</p>
                  <div className="flex flex-wrap gap-1">
                    {bestHours.slice(0, 3).map((hour, i) => (
                      <span key={i} className={cn(
                        'text-xs px-2.5 py-1 rounded-full',
                        i === 0 ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60'
                      )}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {hour}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info pipeline */}
      <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4">
        <p className="text-sm text-blue-300 font-semibold mb-1">ℹ️ Comment ça marche</p>
        <p className="text-xs text-blue-300/60 leading-relaxed">
          Prophet analyse l'historique d'engagement de votre page Facebook via l'API Meta Graph
          (90 jours de données) et prédit les créneaux où votre audience est la plus active.
          Ces créneaux sont automatiquement assignés à vos publications en file d'attente.
          Playwright complète les données &gt; 90 jours via web scraping.
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 2 — FILE D'ATTENTE
// ══════════════════════════════════════════════════════════════
function ContentQueueView({ account, accounts }) {
  const [queue,      setQueue]     = useState([])
  const [isLoading,  setIsLoading] = useState(true)
  const [isAdding,   setIsAdding]  = useState(false)
  const [showForm,   setShowForm]  = useState(false)
  const [form,       setForm]      = useState({
    social_account_id: '',
    message          : '',
    image_url        : '',
    link_url         : '',
    scheduled_at     : '',
  })

  const loadQueue = useCallback(async () => {
    setIsLoading(true)
    try {
      const r = await socialManagerApi.getQueue()
      setQueue(r.data.data?.queue || [])
    } catch {}
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => {
    loadQueue()
    if (account?.id) setForm(f => ({ ...f, social_account_id: account.id }))
  }, [loadQueue, account?.id])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.message.trim()) { toast.error('Le message est requis.'); return }
    if (!form.social_account_id) { toast.error('Sélectionnez un compte.'); return }

    setIsAdding(true)
    try {
      const r = await socialManagerApi.addToQueue({
        ...form,
        scheduled_at: form.scheduled_at || undefined,
      })
      toast.success(`✅ Publication ajoutée — créneau : ${new Date(r.data.data.scheduled_at).toLocaleString('fr-FR')}`)
      setForm(f => ({ ...f, message: '', image_url: '', link_url: '', scheduled_at: '' }))
      setShowForm(false)
      await loadQueue()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemove = async (id) => {
    if (!window.confirm('Supprimer cette publication ?')) return
    try {
      await socialManagerApi.removeFromQueue(id)
      setQueue(prev => prev.filter(q => q.id !== id))
      toast.success('Publication supprimée.')
    } catch { toast.error('Erreur.') }
  }

  return (
    <div className="space-y-5">
      {/* Formulaire ajout */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-white">📤 Nouvelle publication</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleAdd} className="p-5 space-y-4">
                {/* Sélecteur compte */}
                <div>
                  <label className="block text-xs text-white/50 mb-1">Compte</label>
                  <select
                    value={form.social_account_id}
                    onChange={e => setForm(f => ({ ...f, social_account_id: e.target.value }))}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                  >
                    <option value="" className="bg-slate-800">Sélectionner...</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id} className="bg-slate-800">
                        {PLATFORM_EMOJIS[a.platform]} {a.account_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs text-white/50 mb-1">Message *</label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Texte de la publication..."
                    rows={3}
                    maxLength={63206}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-white/25"
                  />
                  <p className="text-[10px] text-white/30 text-right mt-0.5">{form.message.length} car.</p>
                </div>

                {/* URL image + lien */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">URL image (optionnel)</label>
                    <input type="url" value={form.image_url}
                      onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                      placeholder="https://..."
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Heure publication (vide = Prophet)</label>
                    <input type="datetime-local" value={form.scheduled_at}
                      onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <p className="text-xs text-blue-300/60">
                  🔮 Sans heure spécifiée, Prophet choisit automatiquement le prochain créneau optimal.
                </p>

                <div className="flex gap-3">
                  <button type="submit" disabled={isAdding}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                    {isAdding ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Ajout...</>
                    ) : (
                      <><Send className="h-4 w-4" /> Ajouter à la file</>
                    )}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-4 py-3 border border-white/10 text-white/50 rounded-xl text-sm hover:bg-white/5">
                    Annuler
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Liste de la file */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-white">📋 File d'attente</h3>
          <button onClick={loadQueue} className="p-1.5 text-white/30 hover:text-white/70 rounded-lg">
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : queue.length === 0 ? (
          <div className="text-center py-12 text-white/20">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm">Aucune publication programmée</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
            {queue.map(item => {
              const dt = new Date(item.scheduled_at)
              return (
                <div key={item.id} className="flex items-start gap-3 px-5 py-4 hover:bg-white/2 transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="text-xl">{PLATFORM_EMOJIS[item.platform] || '📱'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 line-clamp-2">{item.message}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-white/40">{item.account_name}</span>
                      {item.has_image && <span className="text-xs text-indigo-400">🖼️ Image</span>}
                      {item.score && (
                        <span className="text-xs text-blue-400">🔮 Score: {Number(item.score).toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-blue-300">
                        {dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </p>
                      <p className="text-xs text-blue-400">
                        {dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full', STATUS_COLORS[item.status] || STATUS_COLORS.draft)}>
                      {item.status === 'scheduled' ? '⏰ Programmé' :
                       item.status === 'published' ? '✅ Publié' :
                       item.status === 'failed'    ? '❌ Échoué'  : item.status}
                    </span>
                    {item.status === 'scheduled' && (
                      <button onClick={() => handleRemove(item.id)}
                        className="p-1 text-white/20 hover:text-red-400 rounded transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 3 — INBOX COMMENTAIRES
// ══════════════════════════════════════════════════════════════
function CommentInboxView({ account }) {
  const [comments,    setComments]    = useState([])
  const [stats,       setStats]       = useState({})
  const [filter,      setFilter]      = useState('pending')
  const [isLoading,   setIsLoading]   = useState(true)
  const [generating,  setGenerating]  = useState(null)
  const [approving,   setApproving]   = useState(null)
  const [editingReply, setEditingReply] = useState({}) // {commentId: text}

  const loadComments = useCallback(async () => {
    setIsLoading(true)
    try {
      const r = await socialManagerApi.getInbox({ status: filter })
      setComments(r.data.data?.comments || [])
      setStats(r.data.data?.stats || {})
    } catch {
      toast.error('Erreur chargement inbox.')
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => { loadComments() }, [loadComments])

  // Générer une réponse Mistral 7B
  const handleGenerateReply = async (commentId) => {
    setGenerating(commentId)
    try {
      const r = await socialManagerApi.generateReply(commentId)
      const draft = r.data.data?.reply_draft || ''
      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, ai_reply_draft: draft, reply_status: 'draft' } : c
      ))
      setEditingReply(prev => ({ ...prev, [commentId]: draft }))
      toast.success('✅ Réponse Mistral 7B générée !')
    } catch {
      toast.error('Erreur génération réponse.')
    } finally {
      setGenerating(null)
    }
  }

  // Approuver et publier
  const handleApprove = async (commentId) => {
    const replyText = editingReply[commentId] || comments.find(c => c.id === commentId)?.ai_reply_draft
    if (!replyText) { toast.error('Aucune réponse à approuver.'); return }

    setApproving(commentId)
    try {
      await socialManagerApi.approveReply(commentId, replyText)
      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, reply_status: 'published', final_reply: replyText } : c
      ))
      toast.success('✅ Réponse approuvée et publiée via Meta Graph API !')
    } catch {
      toast.error('Erreur approbation.')
    } finally {
      setApproving(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats + Filtres */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Stats */}
          <div className="flex gap-4">
            {[
              { label: 'Total',    value: stats.total   || 0, color: 'text-white'     },
              { label: 'En attente',value: stats.pending || 0, color: 'text-amber-400' },
              { label: 'Négatifs', value: stats.negative || 0, color: 'text-red-400'  },
              { label: 'Non lus',  value: stats.unread  || 0, color: 'text-blue-400'  },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className={`text-lg font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-white/30">{label}</p>
              </div>
            ))}
          </div>

          {/* Filtres */}
          <div className="flex gap-2">
            {['pending', 'draft', 'published'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium transition-colors',
                  filter === s ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
                )}>
                {s === 'pending' ? '⏳ En attente' : s === 'draft' ? '✏️ Brouillon' : '✅ Publié'}
              </button>
            ))}
            <button onClick={loadComments} className="p-1.5 text-white/30 hover:text-white/70 rounded-lg">
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {/* Liste commentaires */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-12 text-center text-white/20">
          <div className="text-4xl mb-3">💬</div>
          <p className="text-sm">Aucun commentaire {filter === 'pending' ? 'en attente' : filter}</p>
          <p className="text-xs mt-1">Le polling automatique toutes les 15 min via Meta Graph API</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map(comment => {
            const sentConfig  = SENTIMENT_CONFIG[comment.sentiment_label] || SENTIMENT_CONFIG.NEUTRAL
            const priorityDot = PRIORITY_DOT[comment.priority] || PRIORITY_DOT.medium

            return (
              <div key={comment.id}
                className={cn(
                  'bg-[#1A1A2E] border border-white/5 border-l-4 rounded-r-2xl p-4',
                  sentConfig.border
                )}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full flex-shrink-0', priorityDot)} />
                    <span className="text-sm font-semibold text-white">{comment.commenter_name || 'Utilisateur'}</span>
                    {comment.account_name && (
                      <span className="text-xs text-white/40">{PLATFORM_EMOJIS[comment.platform]} {comment.account_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', sentConfig.bg, sentConfig.color)}>
                      {sentConfig.emoji} {sentConfig.label}
                    </span>
                    <span className="text-[10px] text-white/30">{comment.created_ago}</span>
                  </div>
                </div>

                {/* Message */}
                <p className="text-sm text-white/70 mb-3 leading-relaxed">{comment.message}</p>

                {/* Brouillon IA Mistral 7B */}
                {comment.ai_reply_draft && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-3">
                    <p className="text-[10px] font-semibold text-blue-300 mb-1.5">
                      🤖 Réponse Mistral 7B — En attente d'approbation
                    </p>
                    <textarea
                      value={editingReply[comment.id] ?? comment.ai_reply_draft}
                      onChange={e => setEditingReply(prev => ({ ...prev, [comment.id]: e.target.value }))}
                      rows={3}
                      className="w-full text-sm text-white/80 bg-transparent resize-none border-none outline-none leading-relaxed"
                    />
                  </div>
                )}

                {/* Actions */}
                {comment.reply_status !== 'published' ? (
                  <div className="flex gap-2 flex-wrap">
                    {/* Générer réponse */}
                    {!comment.ai_reply_draft && (
                      <button
                        onClick={() => handleGenerateReply(comment.id)}
                        disabled={generating === comment.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                      >
                        {generating === comment.id ? (
                          <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Génération Mistral 7B...</>
                        ) : (
                          <>🤖 Générer réponse IA</>
                        )}
                      </button>
                    )}
                    {/* Approuver + publier */}
                    {comment.ai_reply_draft && (
                      <>
                        <button
                          onClick={() => handleApprove(comment.id)}
                          disabled={approving === comment.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                        >
                          {approving === comment.id ? (
                            <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Publication...</>
                          ) : (
                            <><Check className="h-3.5 w-3.5" />Approuver & Publier</>
                          )}
                        </button>
                        <button
                          onClick={() => handleGenerateReply(comment.id)}
                          disabled={generating === comment.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-500/30 text-blue-300 rounded-lg text-xs hover:bg-blue-500/10 transition-colors"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Régénérer
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-green-400 font-medium flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" />
                    Réponse publiée via Meta Graph API
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ONGLET 4 — MÉTRIQUES
// ══════════════════════════════════════════════════════════════
function MetricsView({ account }) {
  const [metrics,    setMetrics]    = useState({})
  const [inboxStats, setInboxStats] = useState({})
  const [isLoading,  setIsLoading]  = useState(false)

  const loadMetrics = useCallback(async () => {
    if (!account?.id) return
    setIsLoading(true)
    try {
      const r = await socialManagerApi.getMetrics(account.id)
      setMetrics(r.data.data?.metrics || {})
      setInboxStats(r.data.data?.inbox_stats || {})
    } catch {
      toast.error('Erreur chargement métriques.')
    } finally {
      setIsLoading(false)
    }
  }, [account?.id])

  useEffect(() => { loadMetrics() }, [loadMetrics])

  // page_impressions / page_engaged_users / page_fans / page_fan_adds ont
  // été retirées de l'API Insights de Meta (confirmé en direct, cf.
  // meta_client.py get_page_insights_hourly) — followers_count vient
  // maintenant d'un champ direct de la Page, plus des Insights.
  const METRIC_LABELS = {
    followers_count       : { label: 'Abonnés totaux',        icon: '👥', color: 'blue'   },
    page_views_total      : { label: 'Vues de page',          icon: '📊', color: 'purple' },
    page_post_engagements : { label: 'Engagements publications', icon: '❤️', color: 'red' },
    page_total_actions    : { label: 'Actions sur la Page',   icon: '📈', color: 'green'  },
  }

  if (!account) {
    return (
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-12 text-center text-white/20">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-sm">Sélectionnez un compte pour voir les métriques.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-white">
            📊 Métriques — {account.account_name}
            <span className="text-xs text-white/40 ml-2 font-normal">7 derniers jours · Meta Graph API v21</span>
          </h3>
          <button onClick={loadMetrics} disabled={isLoading}
            className="p-1.5 text-white/30 hover:text-white/70 rounded-lg">
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : Object.keys(metrics).length === 0 ? (
          <div className="text-center py-8 text-white/20">
            <p className="text-sm">Aucune métrique disponible.</p>
            <p className="text-xs mt-1">Les métriques sont enregistrées toutes les heures via Meta Graph API.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(METRIC_LABELS).map(([key, config]) => {
              const values = metrics[key] || []
              const latest = values[0]?.value ?? 'N/A'
              const prev   = values[1]?.value
              const change = prev && typeof latest === 'number'
                ? ((latest - prev) / prev * 100).toFixed(1)
                : null

              return (
                <div key={key} className={`bg-${config.color}-500/10 border border-${config.color}-500/20 rounded-2xl p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{config.icon}</span>
                    <p className="text-xs text-white/50">{config.label}</p>
                  </div>
                  <p className={`text-2xl font-bold text-${config.color}-300`}>
                    {typeof latest === 'number' ? latest.toLocaleString('fr-FR') : latest}
                  </p>
                  {change !== null && (
                    <p className={cn('text-xs mt-1', parseFloat(change) >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {parseFloat(change) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(change))}% vs hier
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Stats inbox */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">💬 Stats Inbox Commentaires</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total commentaires',   value: inboxStats.total   || 0, color: 'text-white'     },
            { label: 'En attente réponse',   value: inboxStats.pending || 0, color: 'text-amber-400' },
            { label: 'Négatifs urgents',     value: inboxStats.negative|| 0, color: 'text-red-400'   },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/5 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-white/40 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl">
          <p className="text-xs text-blue-300/70">
            📊 Scheduler Laravel : polling commentaires toutes les 15 min ·
            métriques page toutes les heures · publication automatique des posts programmés.
          </p>
        </div>
      </div>
    </div>
  )
}