// frontend/src/components/professional/ProfessionalSidebar.jsx
import { useNavigate } from 'react-router-dom'
import { Settings, LogOut, Store } from 'lucide-react'
import { toast } from 'sonner'
import { useLogout } from '@/hooks/useAuth'
import logo from '@/assets/logo.png'
import { Wordmark } from '@/components/brand/Wordmark'

const NAV_ITEMS = [
  { id: 'overview',  label: 'Vue d\'ensemble', icon: '🏠' },
  { id: 'clients',   label: 'Clients CRM',     icon: '👥' },
  { id: 'agents',    label: '7 Agents IA',     icon: '🤖' },
  { id: 'analytics', label: 'Analytics',       icon: '📈' },
  { id: 'billing',   label: 'Facturation',     icon: '💰' },
]

const cn = (...c) => c.filter(Boolean).join(' ')

export function ProfessionalSidebar({ activeTab, onTabChange, profile }) {
  const navigate = useNavigate()
  const logoutMutation = useLogout()

  return (
    <div className="w-56 bg-[#141420] border-r border-white/5 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Social Mind AI" className="w-8 h-8 object-contain" />
          <div>
            <Wordmark className="text-sm font-bold leading-none" />
            <p className="text-indigo-400 text-[10px]">Professional</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left',
              activeTab === item.id
                ? 'bg-indigo-600/20 text-white border border-indigo-500/30'
                : 'text-white/50 hover:bg-white/5 hover:text-white/80'
            )}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

        <div className="pt-3 border-t border-white/5">
          <button
            onClick={() => toast.info('Marketplace — bientôt disponible.')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:bg-white/5 hover:text-white/80 transition-colors"
          >
            <Store className="h-4 w-4" />
            <span>Marketplace</span>
          </button>
          <button
            onClick={() => navigate('/dashboard/professional/settings')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:bg-white/5 hover:text-white/80 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Paramètres</span>
          </button>
        </div>
      </nav>

      {/* Profile utilisateur */}
      {profile && (
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 cursor-pointer">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {(profile.agency_name || 'A')[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{profile.agency_name || 'Mon Agence'}</p>
              <p className="text-white/40 text-[10px] truncate capitalize">{profile.activity_type?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Déconnexion */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          <span>{logoutMutation.isPending ? 'Déconnexion...' : 'Déconnexion'}</span>
        </button>
      </div>
    </div>
  )
}