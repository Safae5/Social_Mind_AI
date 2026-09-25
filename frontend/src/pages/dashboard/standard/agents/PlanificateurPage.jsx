// frontend/src/pages/dashboard/standard/agents/PlanificateurPage.jsx
import { useState } from 'react'
import { ArrowLeft, Zap, Calendar, BarChart2, List, RefreshCw, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  useSocialAccounts, useOptimalSlots, useCalendar,
  useContentQueue, useUpcomingPosts, useAnalyze,
  useAddToQueue, useRemoveFromQueue, useCancelPost,
} from '@/hooks/useScheduler'
import AccountConnector     from '@/components/scheduler/AccountConnector'
import OptimalSlotsHeatmap  from '@/components/scheduler/OptimalSlotsHeatmap'
import ContentQueueList     from '@/components/scheduler/ContentQueueList'
import SchedulerCalendar    from '@/components/scheduler/SchedulerCalendar'
import UpcomingPostsList    from '@/components/scheduler/UpcomingPostsList'

const TABS = [
  { id: 'overview',  label: 'Vue d\'ensemble', Icon: BarChart2 },
  { id: 'calendar',  label: 'Calendrier',       Icon: Calendar  },
  { id: 'queue',     label: 'File d\'attente',  Icon: List      },
  { id: 'accounts',  label: 'Mes comptes',      Icon: Zap       },
]

const cn = (...c) => c.filter(Boolean).join(' ')

export default function PlanificateurPage() {
  const navigate         = useNavigate()
  const [activeTab, setTab] = useState('overview')
  const [showQueueForm, setShowQueueForm] = useState(false)

  const { data: accountsData, isLoading: loadingAccounts } = useSocialAccounts()
  const { data: slotsData,    isLoading: loadingSlots    } = useOptimalSlots()
  const { data: calendarData, isLoading: loadingCalendar } = useCalendar(30)
  const { data: queueData,    isLoading: loadingQueue    } = useContentQueue()
  const { data: upcomingPosts } = useUpcomingPosts()

  const analyzeMutation      = useAnalyze()
  const addToQueueMutation   = useAddToQueue()
  const removeFromQueueMutation = useRemoveFromQueue()
  const cancelPostMutation   = useCancelPost()

  const accounts   = accountsData?.accounts ?? []
  const slots      = slotsData?.slots       ?? []
  const heatmap    = calendarData?.heatmap  ?? []
  const upcoming   = calendarData?.upcoming_posts ?? upcomingPosts ?? []
  const queue      = queueData?.queue       ?? []

  const handleAnalyze = (accountId) => {
    analyzeMutation.mutate({ accountId, async: true })
  }

  const handleAddToQueue = (formData) => {
    addToQueueMutation.mutate(formData, {
      onSuccess: () => setShowQueueForm(false),
    })
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4]">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/dashboard/agents')}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              📅 Planificateur Intelligent
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                Prophet + KMeans
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Publiez au bon moment, automatiquement.
            </p>
          </div>

          <div className="ml-auto flex gap-3">
            <button
              onClick={() => setShowQueueForm(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Ajouter à la file
            </button>
          </div>
        </div>
      </div>

      {/* ── Onglets ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 flex gap-0">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors',
                activeTab === id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Tab : Vue d'ensemble */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Stats cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Comptes connectés',    value: accounts.length,    max: '/2',   color: 'indigo' },
                { label: 'Créneaux optimaux',    value: slots.length,       max: '',     color: 'green'  },
                { label: 'Publications à venir', value: upcoming.length,    max: '',     color: 'amber'  },
                { label: 'Dans la file',         value: queue.length,       max: '',     color: 'violet' },
              ].map(({ label, value, max, color }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className={`text-3xl font-bold text-${color}-600`}>
                    {loadingAccounts ? '—' : value}
                    <span className="text-base font-normal text-gray-400">{max}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Comptes + Analyse */}
            {accounts.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
                <div className="text-5xl mb-4">🔗</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Connectez un réseau social
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  L'IA analysera vos publications passées pour détecter vos meilleurs créneaux.
                </p>
                <button
                  onClick={() => setTab('accounts')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium"
                >
                  Connecter un compte
                </button>
              </div>
            ) : (
              <>
                {/* Heatmap des créneaux optimaux */}
                {slots.length > 0 ? (
                  <OptimalSlotsHeatmap
                    slots={slots}
                    heatmap={heatmap}
                    onAnalyze={handleAnalyze}
                    accounts={accounts}
                    isAnalyzing={analyzeMutation.isPending}
                  />
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                    <RefreshCw className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-2">Analyse en attente</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Lancez l'analyse pour que l'IA identifie vos meilleurs créneaux de publication.
                    </p>
                    {accounts.map(account => (
                      <button
                        key={account.id}
                        onClick={() => handleAnalyze(account.id)}
                        disabled={analyzeMutation.isPending}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 mr-2"
                      >
                        {analyzeMutation.isPending ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Analyse en cours...
                          </span>
                        ) : (
                          `🔍 Analyser @${account.username} (${account.platform})`
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Publications à venir */}
                <UpcomingPostsList
                  posts={upcoming}
                  onCancel={(id) => cancelPostMutation.mutate(id)}
                  isCancelling={cancelPostMutation.isPending}
                />
              </>
            )}
          </motion.div>
        )}

        {/* Tab : Calendrier */}
        {activeTab === 'calendar' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {loadingCalendar ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              </div>
            ) : (
              <SchedulerCalendar
                upcomingPosts={upcoming}
                optimalSlots={slots}
                onAddToQueue={() => setShowQueueForm(true)}
                onCancelPost={(id) => cancelPostMutation.mutate(id)}
              />
            )}
          </motion.div>
        )}

        {/* Tab : File d'attente */}
        {activeTab === 'queue' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <ContentQueueList
              queue={queue}
              accounts={accounts}
              isLoading={loadingQueue}
              onAdd={handleAddToQueue}
              onRemove={(id) => removeFromQueueMutation.mutate(id)}
              isRemoving={removeFromQueueMutation.isPending}
              showForm={showQueueForm}
              onToggleForm={setShowQueueForm}
            />
          </motion.div>
        )}

        {/* Tab : Comptes */}
        {activeTab === 'accounts' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <AccountConnector
              accounts={accounts}
              isLoading={loadingAccounts}
              onAnalyze={handleAnalyze}
              isAnalyzing={analyzeMutation.isPending}
            />
          </motion.div>
        )}
      </div>

      {/* ── Modal Ajout à la file ── */}
      {showQueueForm && (
        <AddToQueueModal
          accounts={accounts}
          onClose={() => setShowQueueForm(false)}
          onSubmit={handleAddToQueue}
          isLoading={addToQueueMutation.isPending}
        />
      )}
    </div>
  )
}

// ── Modal Ajout à la file ──────────────────────────────────────
function AddToQueueModal({ accounts, onClose, onSubmit, isLoading }) {
  const [form, setForm] = useState({
    social_account_id: accounts[0]?.id?.toString() || '',
    caption    : '',
    hashtags   : '',
    media_url  : '',
    media_type : 'image',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      social_account_id: parseInt(form.social_account_id),
      caption   : form.caption,
      hashtags  : form.hashtags ? form.hashtags.split(' ').filter(h => h.startsWith('#')) : [],
      media_url : form.media_url || null,
      media_type: form.media_type,
      source    : 'manual',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Ajouter à la file d'attente</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Compte */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Compte</label>
            <select
              value={form.social_account_id}
              onChange={e => setForm(f => ({ ...f, social_account_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.platform} — @{acc.username}
                </option>
              ))}
            </select>
          </div>

          {/* Légende */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Légende *</label>
            <textarea
              value={form.caption}
              onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
              rows={4}
              placeholder="Votre texte de publication..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
              required
            />
            <p className="text-xs text-gray-400 mt-1">{form.caption.length}/2200 caractères</p>
          </div>

          {/* Hashtags */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Hashtags</label>
            <input
              value={form.hashtags}
              onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))}
              placeholder="#fashion #style #ootd"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* URL Média */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">URL du média (optionnel)</label>
            <input
              value={form.media_url}
              onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))}
              placeholder="https://..."
              type="url"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Type de publication</label>
            <div className="flex gap-2 flex-wrap">
              {['image', 'video', 'reel', 'carousel', 'story', 'text'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, media_type: type }))}
                  className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
                    form.media_type === type
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading || !form.caption.trim() || !form.social_account_id}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Ajout en cours...
                </span>
              ) : '📋 Ajouter à la file'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}