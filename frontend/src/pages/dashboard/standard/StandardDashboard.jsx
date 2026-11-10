import { useState, useMemo } from 'react'
import { Routes, Route, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Home, Sparkles, Calendar, MessageSquare,
  BarChart2, Settings, LogOut, ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuth }   from '@/context/AuthContext'
import { useLogout } from '@/hooks/useAuth'
import { useQuery }  from '@tanstack/react-query'
import { toast }     from 'sonner'
import api from '@/lib/axios'
import logo from '@/assets/logo.png'
import { Wordmark } from '@/components/brand/Wordmark'

import DashboardHome          from './pages/DashboardHome'
import AgentsPage             from './pages/AgentsPage'
import PlanificateurPage      from './agents/PlanificateurPage'
import GenerateurLegendesPage from './agents/GenerateurLegendesPage'
import HashtagPage            from './agents/HashtagPage'
import InboxPage              from './agents/InboxPage'
import WeeklyReportPage       from './agents/WeeklyReportPage'
import CalendarPage           from './agents/CalendarPage'
import SettingsPage           from './pages/SettingsPage'

const cn = (...c) => c.filter(Boolean).join(' ')

const NAV = [
  { path: '',         label: 'Accueil',      Icon: Home },
  { path: 'agents',   label: 'Mes outils IA', Icon: Sparkles },
  { path: 'calendar', label: 'Calendrier',   Icon: Calendar },
  { path: 'inbox',    label: 'Messages',     Icon: MessageSquare, badge: true },
  { path: 'reports',  label: 'Statistiques', Icon: BarChart2, badge: true },
  { path: 'settings', label: 'Paramètres',   Icon: Settings },
]

// ── Fix 3 : motion_div remplacé par un vrai composant utilisé ─
function AnimatedDiv({ children, className }) {
  return <div className={className}>{children}</div>
}

// ── Popup Marketplace ─────────────────────────────────────────
function MarketplacePopup({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <AnimatedDiv className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Besoin d'aide professionnelle ?
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Nos agences certifiées Social Mind AI peuvent gérer votre
            marketing pendant que notre IA les assiste.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => { toast.info('Marketplace — bientôt disponible.'); onClose() }}
              className="flex-1 bg-violet-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-violet-700"
            >
              Voir les agences
            </button>
            <button
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm hover:bg-gray-50"
            >
              Plus tard
            </button>
          </div>
        </div>
      </AnimatedDiv>
    </div>
  )
}

export default function StandardDashboard() {
  const { user }       = useAuth()
  const logoutMutation = useLogout()
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()
  const [collapsed, setCollapsed] = useState(false)

  // ── Fix 4 : dérive showMarketplace depuis searchParams sans useEffect ──
  // useMemo évite l'effet de bord — calculé au rendu, pas dans un effect
  const showMarketplace = useMemo(
    () => searchParams.get('marketplace') === 'true',
    [searchParams]
  )

  const [marketplaceDismissed, setMarketplaceDismissed] = useState(false)

  // Badges non lus
  const { data: badges } = useQuery({
    queryKey: ['dashboard-badges'],
    queryFn : async () => {
      const [reports, inbox] = await Promise.allSettled([
        api.get('/weekly-reports').then(r => r.data.data.unread_count || 0).catch(() => 0),
        api.get('/inbox').then(r => r.data.data.unread || 0).catch(() => 0),
      ])
      return {
        reports: reports.status === 'fulfilled' ? reports.value : 0,
        inbox  : inbox.status   === 'fulfilled' ? inbox.value   : 0,
      }
    },
    staleTime: 60000,
  })

  const getBadge = (path) => {
    if (path === 'reports') return badges?.reports || 0
    if (path === 'inbox')   return badges?.inbox   || 0
    return 0
  }

  return (
    <div className="flex h-screen bg-[#F8F7F4] overflow-hidden">

      {/* Marketplace popup — affiché seulement si pas encore fermé */}
      {showMarketplace && !marketplaceDismissed && (
        <MarketplacePopup onClose={() => setMarketplaceDismissed(true)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={cn(
        'flex flex-col bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}>
        {/* Logo + toggle */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-gray-100">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <img src={logo} alt="Social Mind AI" className="w-8 h-8 object-contain" />
              <Wordmark theme="light" className="font-bold text-sm" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 ml-auto"
          >
            {collapsed
              ? <ChevronRight className="h-4 w-4" />
              : <ChevronLeft  className="h-4 w-4" />}
          </button>
        </div>

        {/* Bouton IA */}
        <div className="px-2 py-2 border-b border-gray-100">
          <button
            onClick={() => navigate('/dashboard/agents')}
            className={cn(
              'flex items-center gap-2 bg-green-400 hover:bg-green-500 text-white rounded-full text-sm font-medium transition-colors',
              collapsed ? 'w-10 h-10 justify-center' : 'w-full px-4 py-2'
            )}
          >
            <Sparkles className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Créer avec l'IA</span>}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ path, label, Icon, badge }) => {
            const fullPath    = `/dashboard${path ? '/' + path : ''}`
            const badgeCount  = badge ? getBadge(path) : 0
            return (
              <NavLink
                key={path}
                to={fullPath}
                end={!path}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium relative',
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span className="flex-1">{label}</span>}
                {badgeCount > 0 && (
                  <span className={cn(
                    'bg-red-500 text-white text-xs font-bold rounded-full',
                    collapsed
                      ? 'absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-[10px]'
                      : 'px-1.5 py-0.5 min-w-[20px] text-center'
                  )}>
                    {badgeCount}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-2 pb-4 border-t border-gray-100 pt-3">
          {!collapsed && (
            <div className="px-3 py-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-violet-700">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {user?.full_name}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">
                    {user?.current_plan}
                  </p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => logoutMutation.mutate()}
            className={cn(
              'flex items-center gap-3 w-full rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors',
              collapsed ? 'justify-center py-2' : 'px-3 py-2'
            )}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* ── Contenu ── */}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route index                       element={<DashboardHome />} />
          <Route path="agents"               element={<AgentsPage />} />
          <Route path="agents/planificateur" element={<PlanificateurPage />} />
          <Route path="agents/legendes"      element={<GenerateurLegendesPage />} />
          <Route path="agents/hashtags"      element={<HashtagPage />} />
          <Route path="inbox"                element={<InboxPage />} />
          <Route path="reports"              element={<WeeklyReportPage />} />
          <Route path="calendar"             element={<CalendarPage />} />
          <Route path="settings"             element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}