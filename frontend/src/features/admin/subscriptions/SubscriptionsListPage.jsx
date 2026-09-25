// frontend/src/features/admin/subscriptions/SubscriptionsListPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, DollarSign, Percent, Info } from 'lucide-react'
import { adminSubscriptionsApi } from '@/api/admin/subscriptionsApi'
import { PageHeader } from '../components/PageHeader'
import { StatsCard } from '../components/StatsCard'
import { StatusBadge } from '../components/StatusBadge'
import { Pagination } from '../components/Pagination'
import { LoadingState } from '../components/LoadingState'
import { ErrorState } from '../components/ErrorState'
import { EmptyState } from '../components/EmptyState'
import { CreditCard } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'active', label: 'Actif' },
  { value: 'trialing', label: 'Essai' },
  { value: 'canceled', label: 'Annulé' },
  { value: 'past_due', label: 'Impayé' },
]

export function SubscriptionsListPage() {
  const [metrics, setMetrics]   = useState(null)
  const [result, setResult]     = useState(null)
  const [status, setStatus]     = useState('')
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const load = useCallback(() => {
    setLoading(true); setError(null)
    Promise.all([
      adminSubscriptionsApi.metrics(),
      adminSubscriptionsApi.list({ status: status || undefined, page, per_page: 20 }),
    ])
      .then(([m, s]) => { setMetrics(m.data.data); setResult(s.data.data) })
      .catch(() => setError('Impossible de charger les abonnements.'))
      .finally(() => setLoading(false))
  }, [status, page])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingState label="Chargement des abonnements…" />
  if (error)   return <ErrorState message={error} onRetry={load} />

  return (
    <div>
      <PageHeader title="Abonnements" description="Vue d'ensemble facturation et abonnements" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard label="MRR" value={`$${metrics.mrr.toLocaleString('fr-FR')}`} icon={DollarSign}
          hint="Revenu mensuel récurrent (abonnements actifs uniquement)" />
        <StatsCard label="ARR" value={`$${metrics.arr.toLocaleString('fr-FR')}`} icon={TrendingUp} hint="MRR × 12" />
        <StatsCard label="Churn (30j)" value={metrics.churn_rate_30d_pct !== null ? `${metrics.churn_rate_30d_pct}%` : '—'}
          icon={Percent} hint={metrics.churn_rate_30d_note || 'Annulations / abonnements existants il y a 30j'} />
        <StatsCard label="Conversion essai→payant" value="—" icon={Info} hint={metrics.trial_to_paid_conversion_note} />
      </div>

      {metrics.revenue_by_plan?.length > 0 && (
        <div className="bg-[#12141A] border border-white/8 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-white mb-3">
            Revenu par plan ({metrics.revenue_period.from} → {metrics.revenue_period.to})
          </h3>
          <div className="space-y-1.5">
            {metrics.revenue_by_plan.map(r => (
              <div key={r.plan_slug} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{r.plan_name}</span>
                <span className="text-slate-400 tabular-nums">${Number(r.revenue).toLocaleString('fr-FR')} · {r.invoice_count} facture(s)</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {metrics.total_invoices === 0 && (
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-2.5 mb-6 text-xs text-amber-300/80">
          Aucune facture dans la base — le revenu par plan restera vide tant qu'aucun paiement réel n'a été enregistré.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="bg-[#12141A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-[#12141A]">{o.label}</option>)}
        </select>
      </div>

      <div className="bg-[#12141A] border border-white/8 rounded-xl overflow-hidden">
        {result.subscriptions.length === 0 ? (
          <EmptyState icon={CreditCard} title="Aucun abonnement trouvé" description="Essayez d'ajuster le filtre de statut." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left font-medium px-4 py-3">Utilisateur</th>
                    <th className="text-left font-medium px-4 py-3">Plan</th>
                    <th className="text-left font-medium px-4 py-3">Statut</th>
                    <th className="text-left font-medium px-4 py-3">Source</th>
                    <th className="text-left font-medium px-4 py-3">Cycle</th>
                    <th className="text-left font-medium px-4 py-3">Prochaine facturation</th>
                  </tr>
                </thead>
                <tbody>
                  {result.subscriptions.map(s => (
                    <tr key={s.id} className="border-b border-white/5">
                      <td className="px-4 py-3">
                        {s.user ? (
                          <Link to={`/admin/users/${s.user.id}`} className="text-indigo-300 hover:text-indigo-200 font-medium">
                            {s.user.name}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{s.plan || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.status === 'active' ? 'active' : s.status === 'trialing' ? 'pending' : s.status === 'canceled' ? 'inactive' : 'suspended'} /></td>
                      <td className="px-4 py-3 text-xs text-slate-500">{s.source === 'admin_manual' ? 'Accordé (admin)' : 'Stripe'}</td>
                      <td className="px-4 py-3 text-slate-400">{s.billing_cycle}</td>
                      <td className="px-4 py-3 text-slate-500 tabular-nums">
                        {s.next_billing_at ? new Date(s.next_billing_at).toLocaleDateString('fr-FR') : '—'}
                        {s.next_billing_amount ? ` · $${s.next_billing_amount}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4">
              <Pagination
                currentPage={result.pagination.current_page}
                lastPage={result.pagination.last_page}
                total={result.pagination.total}
                perPage={result.pagination.per_page}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
