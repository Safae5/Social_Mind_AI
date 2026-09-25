// frontend/src/features/admin/layout/AdminHeader.jsx
import { LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLogout } from '@/hooks/useAuth'

export function AdminHeader() {
  const { user } = useAuth()
  const logoutMutation = useLogout()

  return (
    <header className="h-14 flex items-center justify-between px-5 border-b border-white/8 bg-[#0D0F14]">
      <div />
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400">{user?.email}</span>
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Déconnexion
        </button>
      </div>
    </header>
  )
}
