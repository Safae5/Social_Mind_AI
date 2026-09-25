import { useAuth } from '@/context/AuthContext'
import { useLogout } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'

export default function AdminDashboard() {
  const { user }       = useAuth()
  const logoutMutation = useLogout()

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Admin Panel — {user?.first_name}
              </h1>
              <p className="text-gray-400 text-sm mt-1">Étape 3 ✅</p>
            </div>
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              loading={logoutMutation.isPending}
            >
              Déconnexion
            </Button>
          </div>
          <div className="bg-violet-900/30 border border-violet-500/30 rounded-lg p-4 text-violet-300 text-sm">
            ✅ Accès Admin confirmé ! Rôle : <strong>{user?.role}</strong>
          </div>
        </div>
      </div>
    </div>
  )
}