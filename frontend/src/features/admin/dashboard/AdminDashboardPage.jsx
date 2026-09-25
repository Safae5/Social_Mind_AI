// frontend/src/features/admin/dashboard/AdminDashboardPage.jsx
import { useEffect, useState } from 'react'
import { Users, CreditCard, Bot } from 'lucide-react'
import { adminDashboardApi } from '@/api/admin/dashboardApi'
import { PageHeader } from '../components/PageHeader'
import { StatsCard } from '../components/StatsCard'
import { LoadingState } from '../components/LoadingState'
import { ErrorState } from '../components/ErrorState'

export function AdminDashboardPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = () => {
    setLoading(true); setError(null)
    adminDashboardApi.getOverview()
      .then(r => setData(r.data.data))
      .catch(() => setError('Impossible de charger la vue d\'ensemble.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return <LoadingState label="Chargement de la vue d'ensemble…" />
  if (error)   return <ErrorState message={error} onRetry={load} />

  return (
    <div>
      <PageHeader title="Vue d'ensemble" description="État général de la plateforme Social Mind AI" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          label="Utilisateurs totaux"
          value={data.total_users.toLocaleString('fr-FR')}
          icon={Users}
          hint={Object.entries(data.users_by_role || {})
            .filter(([role]) => role)
            .map(([role, count]) => `${count} ${role}`).join(' · ')}
        />
        <StatsCard
          label="Abonnements actifs"
          value={data.active_subscriptions.toLocaleString('fr-FR')}
          icon={CreditCard}
        />
        <StatsCard
          label="Agents IA en ligne"
          value={`${data.agents_online} / ${data.agents_total}`}
          icon={Bot}
          hint={data.agents_online === 0 ? 'Monitoring pas encore actif (Phase 6)' : undefined}
        />
      </div>
    </div>
  )
}
