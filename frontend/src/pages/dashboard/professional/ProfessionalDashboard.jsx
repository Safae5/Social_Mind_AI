// frontend/src/pages/dashboard/professional/ProfessionalDashboard.jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, ChevronDown, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { professionalApi } from '@/api/professionalApi'
import { ClientSelector      } from '@/components/professional/ClientSelector'
import { ProfessionalSidebar } from '@/components/professional/ProfessionalSidebar'
import { NotificationPanel   } from '@/components/professional/NotificationPanel'
import { AgentCard           } from './agents/AgentCard'
import { LiveActivityFeed    } from './activity/LiveActivityFeed'
import { AggregatedAnalytics } from './analytics/AggregatedAnalytics'
import { ClientList          } from './clients/ClientList'
import { ClientBilling       } from './billing/ClientBilling'
import AccountManagerPage      from './agents/account-manager/AccountManagerPage'
import SocialManagerPage       from './agents/social-manager/SocialManagerPage'
import ContentStrategyPage     from './agents/content-strategy/ContentStrategyPage'
import ContentCreatorPage      from './agents/content-creator/ContentCreatorPage'
import AnalyticsPage           from './agents/analytics/AnalyticsPage'
import AdOptimizerPage         from './agents/ad-optimizer/AdOptimizerPage'
import CompetitiveIntelPage    from './agents/competitive-intel/CompetitiveIntelPage'

const TABS = [
  { id: 'overview',   label: '🏠 Vue d\'ensemble' },
  { id: 'clients',    label: '👥 Clients CRM'     },
  { id: 'agents',     label: '🤖 Agents IA'       },
  { id: 'analytics',  label: '📈 Analytics'       },
  { id: 'billing',    label: '💰 Facturation'     },
]

const cn = (...c) => c.filter(Boolean).join(' ')

export default function ProfessionalDashboard() {
  const navigate       = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab,    setActiveTab]    = useState('overview')
  const [selectedClient, setSelectedClient] = useState(null) // null = All clients
  const [clients,      setClients]      = useState([])
  const [agents,       setAgents]       = useState([])
  const [activity,     setActivity]     = useState([])
  const [analytics,    setAnalytics]    = useState(null)
  const [profile,      setProfile]      = useState(null)
  const [isLoading,    setIsLoading]    = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [expandedAgent, setExpandedAgent] = useState(null)
  const [notifOpen,    setNotifOpen]    = useState(false)

  const loadDashboard = useCallback(async () => {
    try {
      const [profileRes, clientsRes, agentsRes, activityRes, analyticsRes] = await Promise.all([
        professionalApi.getOnboardingStatus(),
        professionalApi.getClients({ per_page: 50 }),
        professionalApi.getAgents({ client_id: selectedClient?.id }),
        professionalApi.getActivity({ client_id: selectedClient?.id, limit: 20 }),
        professionalApi.getAnalytics({ client_id: selectedClient?.id }),
      ])

      setProfile(profileRes.data.data.profile)
      setClients(clientsRes.data.data?.data || [])
      setAgents(agentsRes.data.data.agents || [])
      setActivity(activityRes.data.data.activity || [])
      setAnalytics(analyticsRes.data.data)

      // Redirect to onboarding si pas terminé
      if (!profileRes.data.data.onboarding_completed) {
        navigate('/dashboard/professional/onboarding')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [selectedClient, navigate])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  // Rechargement périodique activité (30s)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const r = await professionalApi.getActivity({ client_id: selectedClient?.id, limit: 20 })
        setActivity(r.data.data.activity || [])
      } catch {}
    }, 30000)
    return () => clearInterval(interval)
  }, [selectedClient])

  // Retour du flux OAuth Meta réel (Instagram/Facebook) — voir
  // MetaOAuthController::callback(), qui redirige ici avec ces params.
  useEffect(() => {
    const oauthSuccess = searchParams.get('oauth_success')
    const oauthError    = searchParams.get('oauth_error')
    if (!oauthSuccess && !oauthError) return

    if (oauthSuccess === 'meta') {
      const n = searchParams.get('accounts')
      toast.success(`✅ Compte Meta connecté ! ${n ? `${n} compte(s) importé(s).` : ''}`)
    } else if (oauthError) {
      toast.error(`Erreur connexion Meta : ${oauthError}`)
    }

    setActiveTab('agents')
    setExpandedAgent('social-manager')
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadDashboard()
    toast.success('Dashboard actualisé !')
  }

  const handleClientChange = (client) => {
    setSelectedClient(client)
    setIsLoading(true)
  }

  if (isLoading) {
    return (
      <div className="flex h-screen bg-[#0F0F1A]">
        <ProfessionalSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/50 text-sm">Chargement du Dashboard Professionnel...</p>
          </div>
        </div>
      </div>
    )
  }

  const kpis = analytics?.kpis || {}

  return (
    <div className="flex h-screen bg-[#0F0F1A] overflow-hidden">

      {/* Sidebar */}
      <ProfessionalSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        profile={profile}
      />

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <header className="h-16 bg-[#141420] border-b border-white/5 flex items-center px-6 gap-4 flex-shrink-0">

          {/* Client Selector */}
          <ClientSelector
            clients={clients}
            selectedClient={selectedClient}
            onSelect={handleClientChange}
          />

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-white/40 hover:text-white/80 hover:bg-white/5 rounded-lg transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <NotificationPanel
              activity={activity}
              isOpen={notifOpen}
              onToggle={() => setNotifOpen(o => !o)}
              onClose={() => setNotifOpen(false)}
            />

            <button
              onClick={() => setActiveTab('clients')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Client
            </button>
          </div>
        </header>

        {/* ── Onglets ── */}
        <div className="bg-[#141420] border-b border-white/5 px-6 flex-shrink-0">
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
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

        {/* ── Body scrollable ── */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Vue d'ensemble ── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">

              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Clients Actifs',     value: kpis.active_clients  || clients.filter(c => c.status === 'active').length, icon: '👥', color: 'indigo', suffix: '' },
                  { label: 'Revenu Mensuel',     value: `${Number(kpis.monthly_revenue || 0).toLocaleString('fr-FR')}€`, icon: '💰', color: 'green',  suffix: '' },
                  { label: 'Agents IA Actifs',   value: `${kpis.active_agents || agents.filter(a => a.status === 'active').length}/7`,  icon: '🤖', color: 'purple', suffix: '' },
                  { label: 'Tâches Réalisées',   value: agents.reduce((s, a) => s + a.completed_tasks, 0), icon: '✅', color: 'amber',  suffix: '' },
                ].map(({ label, value, icon, color, suffix }) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{icon}</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{value}{suffix}</p>
                    <p className="text-xs text-white/50 mt-1">{label}</p>
                  </motion.div>
                ))}
              </div>

              {/* 7 Agent Cards */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">
                  🤖 Agents IA
                  {selectedClient && <span className="text-sm text-white/40 ml-2">— {selectedClient.name}</span>}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {agents.map(agent => (
                    <AgentCard
                      key={agent.slug}
                      agent={agent}
                      client={selectedClient}
                      onOpen={() => { setActiveTab('agents'); setExpandedAgent(agent.slug) }}
                    />
                  ))}
                </div>
              </div>

              {/* Layout 2 colonnes : Activité + Quick Access */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Live Activity Feed */}
                <div className="lg:col-span-2">
                  <LiveActivityFeed
                    activity={activity}
                    onRefresh={handleRefresh}
                  />
                </div>

                {/* Quick Access */}
                <div className="space-y-4">
                  <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-4">
                    <h3 className="text-sm font-semibold text-white mb-3">⚡ Accès rapide</h3>
                    <div className="space-y-2">
                      {[
                        { label: '📋 Approbations en attente', count: analytics?.agent_summary?.reduce((s, a) => s + (a.pending || 0), 0) || 0, tab: 'agents' },
                        { label: '💰 Factures en attente',     count: analytics?.invoice_stats?.pending || 0, tab: 'billing' },
                        { label: '👥 Gérer les clients',       count: clients.length, tab: 'clients' },
                      ].map(({ label, count, tab }) => (
                        <button
                          key={label}
                          onClick={() => setActiveTab(tab)}
                          className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 text-sm text-white/70 hover:text-white transition-colors"
                        >
                          <span>{label}</span>
                          {count > 0 && (
                            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-xs">{count}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stats agents */}
                  {analytics?.agent_summary && (
                    <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-4">
                      <h3 className="text-sm font-semibold text-white mb-3">📊 Agents cette semaine</h3>
                      <div className="space-y-2">
                        {analytics.agent_summary.slice(0, 5).map(agent => (
                          <div key={agent.slug} className="flex items-center gap-2">
                            <span className="text-sm">{agent.icon}</span>
                            <span className="text-xs text-white/50 flex-1 truncate">{agent.name}</span>
                            <span className="text-xs text-green-400 font-medium">{agent.success}</span>
                            {agent.errors > 0 && (
                              <span className="text-xs text-red-400">({agent.errors} err.)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── CRM Clients ── */}
          {activeTab === 'clients' && (
            <ClientList
              clients={clients}
              onClientAdded={loadDashboard}
            />
          )}

          {/* ── Agents IA ── */}
          {activeTab === 'agents' && !expandedAgent && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">🤖 Les 7 Agents IA</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {agents.map(agent => (
                  <AgentCard
                    key={agent.slug}
                    agent={agent}
                    client={selectedClient}
                    expanded
                    onOpen={() => setExpandedAgent(agent.slug)}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'agents' && expandedAgent === 'account-manager' && (
            <div className="space-y-4">
              <button
                onClick={() => setExpandedAgent(null)}
                className="text-sm text-white/50 hover:text-white flex items-center gap-1.5"
              >
                ← Retour aux agents
              </button>
              <AccountManagerPage />
            </div>
          )}

          {activeTab === 'agents' && expandedAgent === 'social-manager' && (
            <div className="space-y-4">
              <button
                onClick={() => setExpandedAgent(null)}
                className="text-sm text-white/50 hover:text-white flex items-center gap-1.5"
              >
                ← Retour aux agents
              </button>
              <SocialManagerPage client={selectedClient} />
            </div>
          )}

          {activeTab === 'agents' && expandedAgent === 'content-strategy' && (
            <div className="space-y-4">
              <button
                onClick={() => setExpandedAgent(null)}
                className="text-sm text-white/50 hover:text-white flex items-center gap-1.5"
              >
                ← Retour aux agents
              </button>
              <ContentStrategyPage client={selectedClient} />
            </div>
          )}

          {activeTab === 'agents' && expandedAgent === 'content-creator' && (
            <div className="space-y-4">
              <button
                onClick={() => setExpandedAgent(null)}
                className="text-sm text-white/50 hover:text-white flex items-center gap-1.5"
              >
                ← Retour aux agents
              </button>
              <ContentCreatorPage client={selectedClient} />
            </div>
          )}

          {activeTab === 'agents' && expandedAgent === 'analytics' && (
            <div className="space-y-4">
              <button
                onClick={() => setExpandedAgent(null)}
                className="text-sm text-white/50 hover:text-white flex items-center gap-1.5"
              >
                ← Retour aux agents
              </button>
              <AnalyticsPage client={selectedClient} />
            </div>
          )}

          {activeTab === 'agents' && expandedAgent === 'ad-optimizer' && (
            <div className="space-y-4">
              <button
                onClick={() => setExpandedAgent(null)}
                className="text-sm text-white/50 hover:text-white flex items-center gap-1.5"
              >
                ← Retour aux agents
              </button>
              <AdOptimizerPage client={selectedClient} />
            </div>
          )}

          {activeTab === 'agents' && expandedAgent === 'competitive-intel' && (
            <div className="space-y-4">
              <button
                onClick={() => setExpandedAgent(null)}
                className="text-sm text-white/50 hover:text-white flex items-center gap-1.5"
              >
                ← Retour aux agents
              </button>
              <CompetitiveIntelPage client={selectedClient} />
            </div>
          )}

          {/* ── Analytics ── */}
          {activeTab === 'analytics' && (
            <AggregatedAnalytics analytics={analytics} selectedClient={selectedClient} />
          )}

          {/* ── Facturation ── */}
          {activeTab === 'billing' && (
            <ClientBilling clients={clients} onRefresh={loadDashboard} />
          )}
        </div>
      </div>
    </div>
  )
}