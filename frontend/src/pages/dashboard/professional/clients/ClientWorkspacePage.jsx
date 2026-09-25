// frontend/src/pages/dashboard/professional/clients/ClientWorkspacePage.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { professionalApi } from '@/api/professionalApi'
import AccountManagerPage      from '../agents/account-manager/AccountManagerPage'
import SocialManagerPage       from '../agents/social-manager/SocialManagerPage'
import ContentStrategyPage     from '../agents/content-strategy/ContentStrategyPage'
import ContentCreatorPage      from '../agents/content-creator/ContentCreatorPage'
import AnalyticsPage           from '../agents/analytics/AnalyticsPage'
import AdOptimizerPage         from '../agents/ad-optimizer/AdOptimizerPage'
import CompetitiveIntelPage    from '../agents/competitive-intel/CompetitiveIntelPage'

// Même liste que AddClientModal.jsx — cohérence des icônes/labels agents
const AGENTS = [
  { slug: 'account-manager',   label: '🎯 Chef de Compte'             },
  { slug: 'social-manager',    label: '📱 Gestionnaire RS'            },
  { slug: 'content-strategy',  label: '📊 Stratège Contenu'           },
  { slug: 'content-creator',   label: '✨ Créateur Contenu IA'         },
  { slug: 'analytics',         label: '📈 Analytics IA'               },
  { slug: 'ad-optimizer',      label: '💰 Optimisation Publicitaire'  },
  { slug: 'competitive-intel', label: '🔍 Veille Concurrentielle'     },
]

const cn = (...c) => c.filter(Boolean).join(' ')

const STATUS_COLORS = {
  active  : 'bg-green-400/10 text-green-400',
  paused  : 'bg-amber-400/10 text-amber-400',
  archived: 'bg-gray-400/10 text-gray-400',
  prospect: 'bg-blue-400/10 text-blue-400',
}

const STATUS_STYLES = {
  success: 'text-green-400 bg-green-400/10',
  error  : 'text-red-400 bg-red-400/10',
  running: 'text-blue-400 bg-blue-400/10',
  pending: 'text-amber-400 bg-amber-400/10',
}

export default function ClientWorkspacePage() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const [client,         setClient]         = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [isLoading,      setIsLoading]      = useState(true)
  const [activeAgent,    setActiveAgent]    = useState(AGENTS[0].slug)

  useEffect(() => {
    setIsLoading(true)
    professionalApi.getWorkspace(clientId)
      .then(r => {
        setClient(r.data.data.client)
        setRecentActivity(r.data.data.recent_activity || [])
      })
      .catch(() => toast.error('Impossible de charger ce workspace.'))
      .finally(() => setIsLoading(false))
  }, [clientId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex flex-col items-center justify-center gap-4">
        <p className="text-white/50 text-sm">Client introuvable.</p>
        <button onClick={() => navigate('/dashboard/professional')}
          className="text-indigo-400 hover:text-indigo-300 text-sm">
          ← Retour au dashboard
        </button>
      </div>
    )
  }

  const displayName = client.name || client.company_name || 'Client'

  return (
    <div className="min-h-screen bg-[#0F0F1A] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <button
          onClick={() => navigate('/dashboard/professional')}
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux clients
        </button>

        {/* Header client */}
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {displayName[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{displayName}</h1>
              <p className="text-sm text-white/40">{client.company_name || client.niche || 'N/A'}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[client.status] || STATUS_COLORS.active}`}>
                  {client.status}
                </span>
                {client.monthly_retainer && (
                  <span className="text-xs text-white/40">
                    {Number(client.monthly_retainer).toLocaleString('fr-FR')}€/mois
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agents scopés à ce client */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-2 flex flex-wrap gap-1">
              {AGENTS.map(agent => (
                <button
                  key={agent.slug}
                  onClick={() => setActiveAgent(agent.slug)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap',
                    activeAgent === agent.slug
                      ? 'bg-indigo-600/20 text-white border border-indigo-500/30'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                  )}
                >
                  {agent.label}
                </button>
              ))}
            </div>

            <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
              {activeAgent === 'account-manager'   && <AccountManagerPage client={client} />}
              {activeAgent === 'social-manager'    && <SocialManagerPage client={client} />}
              {activeAgent === 'content-strategy'  && <ContentStrategyPage client={client} />}
              {activeAgent === 'content-creator'   && <ContentCreatorPage client={client} />}
              {activeAgent === 'analytics'         && <AnalyticsPage client={client} />}
              {activeAgent === 'ad-optimizer'      && <AdOptimizerPage client={client} />}
              {activeAgent === 'competitive-intel' && <CompetitiveIntelPage client={client} />}
            </div>
          </div>

          {/* Activité récente réelle */}
          <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-semibold text-white">Activité récente</h2>
            </div>
            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <div className="text-center py-10 text-white/20 text-sm">
                  <div className="text-3xl mb-2">🤖</div>
                  Aucune activité pour le moment
                </div>
              ) : (
                recentActivity.map(log => (
                  <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">{log.agent?.icon || '🤖'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-white/80">{log.agent?.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_STYLES[log.status] || STATUS_STYLES.pending}`}>
                          {log.status}
                        </span>
                      </div>
                      <p className="text-xs text-white/40 mt-0.5">{log.description}</p>
                      <p className="text-[11px] text-white/25 mt-1">{log.created_at}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
