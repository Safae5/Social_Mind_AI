import { useAuth } from '@/context/AuthContext'
import { useLogout } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'

export default function BusinessDashboard() {
  const { user }       = useAuth()
  const logoutMutation = useLogout()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Bonjour, {user?.first_name} 👋
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Dashboard Business — Étape 3 ✅
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              loading={logoutMutation.isPending}
            >
              Déconnexion
            </Button>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-700 text-sm">
            ✅ Authentification réussie ! Rôle : <strong>{user?.role}</strong>
          </div>
        </div>
      </div>
    </div>
  )
}