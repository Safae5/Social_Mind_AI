// frontend/src/pages/dashboard/standard/pages/DashboardHome.jsx
import { useNavigate } from 'react-router-dom'
import { useQuery }    from '@tanstack/react-query'
import { Sparkles, Calendar, MessageSquare, BarChart2, Hash, FileText, Clock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import api from '@/lib/axios'

const cn = (...c) => c.filter(Boolean).join(' ')

// ── Agents disponibles plan Standard ──────────────────────────
const AGENTS = [
  {
    path : '/dashboard/agents/planificateur',
    icon : '📅',
    label: 'Planificateur',
    desc : 'Planifiez et publiez vos posts automatiquement',
    color: 'bg-violet-50 border-violet-200 hover:border-violet-400',
    badge: 'Prophet IA',
  },
  {
    path : '/dashboard/agents/legendes',
    icon : '✍️',
    label: 'Générateur de Légendes',
    desc : 'Créez des légendes engageantes avec Mistral 7B',
    color: 'bg-blue-50 border-blue-200 hover:border-blue-400',
    badge: 'Mistral 7B',
  },
  {
    path : '/dashboard/agents/hashtags',
    icon : '#️⃣',
    label: 'Hashtags IA',
    desc : 'Trouvez les meilleurs hashtags pour votre niche',
    color: 'bg-green-50 border-green-200 hover:border-green-400',
    badge: 'TF-IDF + IA',
  },
  {
    path : '/dashboard/inbox',
    icon : '💬',
    label: 'Messagerie',
    desc : 'Gérez vos commentaires et DMs avec l\'IA',
    color: 'bg-pink-50 border-pink-200 hover:border-pink-400',
    badge: 'Auto-réponse',
  },
  {
    path : '/dashboard/reports',
    icon : '📊',
    label: 'Rapport Hebdo',
    desc : 'Recevez votre bilan de performance chaque semaine',
    color: 'bg-amber-50 border-amber-200 hover:border-amber-400',
    badge: 'Analytics',
  },
  {
    path : '/dashboard/calendar',
    icon : '🗓️',
    label: 'Calendrier',
    desc : 'Visualisez tous vos posts planifiés',
    color: 'bg-indigo-50 border-indigo-200 hover:border-indigo-400',
    badge: 'Planning',
  },
]

export default function DashboardHome() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const firstName  = user?.first_name || 'là'

  // Stats rapides
  const { data: stats } = useQuery({
    queryKey: ['dashboard-home-stats'],
    queryFn : async () => {
      const [scheduled, inbox, reports] = await Promise.allSettled([
        api.get('/scheduler/queue').then(r => r.data.data?.total || 0).catch(() => 0),
        api.get('/inbox').then(r => r.data.data?.unread || 0).catch(() => 0),
        api.get('/weekly-reports').then(r => r.data.data?.total || 0).catch(() => 0),
      ])
      return {
        scheduled: scheduled.status === 'fulfilled' ? scheduled.value : 0,
        inbox    : inbox.status     === 'fulfilled' ? inbox.value     : 0,
        reports  : reports.status   === 'fulfilled' ? reports.value   : 0,
      }
    },
    staleTime: 60000,
  })

  // Prochains posts planifiés
  const { data: upcoming } = useQuery({
    queryKey: ['dashboard-home-upcoming'],
    queryFn : () => api.get('/scheduler/upcoming?limit=3').then(r => r.data.data.posts || []).catch(() => []),
    staleTime: 60000,
  })

  const hour        = new Date().getHours()
  const greeting    = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Voici un aperçu de votre activité Social Mind AI
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/agents')}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Créer avec l'IA
        </button>
      </div>

      {/* ── Stats rapides ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Posts planifiés',
            value: stats?.scheduled ?? '—',
            icon : Calendar,
            color: 'text-violet-600 bg-violet-100',
            path : '/dashboard/calendar',
          },
          {
            label: 'Messages non lus',
            value: stats?.inbox ?? '—',
            icon : MessageSquare,
            color: 'text-pink-600 bg-pink-100',
            path : '/dashboard/inbox',
          },
          {
            label: 'Rapports disponibles',
            value: stats?.reports ?? '—',
            icon : BarChart2,
            color: 'text-amber-600 bg-amber-100',
            path : '/dashboard/reports',
          },
        ].map(stat => (
          <button
            key={stat.label}
            onClick={() => navigate(stat.path)}
            className="bg-white border border-gray-200 rounded-2xl p-5 text-left hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', stat.color)}>
              <stat.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* ── Agents disponibles ── */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          🤖 Vos outils IA
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {AGENTS.map(agent => (
            <button
              key={agent.path}
              onClick={() => navigate(agent.path)}
              className={cn(
                'text-left p-4 rounded-2xl border-2 transition-all',
                agent.color
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{agent.icon}</span>
                <span className="text-[10px] bg-white/70 border border-current/10 px-2 py-0.5 rounded-full text-gray-500 font-medium">
                  {agent.badge}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{agent.label}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{agent.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Prochains posts ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            ⏰ Prochaines publications
          </h2>
          <button
            onClick={() => navigate('/dashboard/calendar')}
            className="text-xs text-violet-600 hover:text-violet-700 font-medium"
          >
            Voir tout →
          </button>
        </div>

        {!upcoming || upcoming.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <div className="text-3xl mb-3">📭</div>
            <p className="text-sm text-gray-500">Aucune publication planifiée</p>
            <button
              onClick={() => navigate('/dashboard/agents/planificateur')}
              className="mt-3 text-xs text-violet-600 hover:text-violet-700 font-medium"
            >
              Planifier un post →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(post => (
              <div
                key={post.id}
                className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 hover:border-gray-300 transition-colors"
              >
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 line-clamp-1">{post.caption}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {post.platform && (
                      <span className="capitalize mr-2">{post.platform}</span>
                    )}
                    {post.scheduled_at && new Date(post.scheduled_at).toLocaleDateString('fr-FR', {
                      weekday: 'long', day: 'numeric', month: 'long',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg font-medium flex-shrink-0">
                  ⏳ Planifié
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Aide rapide ── */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="text-3xl">💡</div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">
              Conseil du jour
            </p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Utilisez le <strong>Planificateur IA</strong> pour analyser vos créneaux
              optimaux avec Prophet — il prédit automatiquement les meilleures heures
              de publication selon l'engagement de votre audience.
            </p>
            <button
              onClick={() => navigate('/dashboard/agents/planificateur')}
              className="mt-2 text-xs text-violet-600 hover:text-violet-700 font-medium"
            >
              Essayer maintenant →
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}