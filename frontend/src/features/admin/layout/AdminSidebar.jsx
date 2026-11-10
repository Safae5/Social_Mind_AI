// frontend/src/features/admin/layout/AdminSidebar.jsx
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, CreditCard, Package, Bot } from 'lucide-react'
import logo from '@/assets/logo.png'
import { Wordmark } from '@/components/brand/Wordmark'

const NAV = [
  { to: '/admin',              label: 'Vue d\'ensemble', icon: LayoutDashboard, end: true },
  { to: '/admin/users',        label: 'Utilisateurs',    icon: Users },
  { to: '/admin/subscriptions',label: 'Abonnements',     icon: CreditCard },
  { to: '/admin/plans',        label: 'Plans',           icon: Package },
  { to: '/admin/ai-agents',    label: 'Agents IA',       icon: Bot },
]

export function AdminSidebar() {
  return (
    <aside className="w-56 flex-shrink-0 bg-[#0D0F14] border-r border-white/8 flex flex-col">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-white/8">
        <img src={logo} alt="Social Mind AI" className="w-6 h-6 object-contain" />
        <div>
          <Wordmark className="text-sm font-semibold leading-none" />
          <p className="text-[10px] text-slate-500 leading-none mt-0.5">Administration</p>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-500/10 text-indigo-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
