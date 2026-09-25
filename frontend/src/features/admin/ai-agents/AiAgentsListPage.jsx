// frontend/src/features/admin/ai-agents/AiAgentsListPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Bot, Activity, AlertTriangle, DollarSign, Info } from 'lucide-react'
import { adminAiAgentsApi } from '@/api/admin/aiAgentsApi'
import { PageHeader } from '../components/PageHeader'
import { StatsCard } from '../components/StatsCard'
import { LoadingState } from '../components/LoadingState'
import { ErrorState } from '../components/ErrorState'
import { EmptyState } from '../components/EmptyState'
import { ConfirmationDialog } from '../components/ConfirmationDialog'

const TIER_OPTIONS = [
  { value: '', label: 'Tous les niveaux' },
  { value: 'standard', label: 'Standard' },
  { value: 'professional', label: 'Professional' },
]

const HEALTH_STYLES = {
  online:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  error:    'bg-red-500/10 text-red-400 border-red-500/20',
  disabled: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}
const HEALTH_LABELS = { online: 'En ligne', error: 'Indisponible', disabled: 'Désactivé' }

function HealthBadge({ status }) {
  const cls = HEALTH_STYLES[status] || HEALTH_STYLES.error
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'online' ? 'bg-emerald-400' : status === 'disabled' ? 'bg-slate-400' : 'bg-red-400'}`} />
      {HEALTH_LABELS[status] || status}
    </span>
  )
}

export function AiAgentsListPage() {
  const [agents, setAgents]     = useState(null)
  const [costs, setCosts]       = useState(null)
  const [tier, setTier]         = useState('')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [busySlug, setBusySlug] = useState(null)
  const [toggleTarget, setToggleTarget] = useState(null) // { slug, name, enabled }

  const load = useCallback(() => {
    setLoading(true); setError(null)
    Promise.all([adminAiAgentsApi.list(), adminAiAgentsApi.costs()])
      .then(([a, c]) => { setAgents(a.data.data.agents); setCosts(c.data.data) })
      .catch(() => setError('Impossible de charger les agents IA.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const confirmToggle = async () => {
    const { slug, enabled } = toggleTarget
    setBusySlug(slug)
    try {
      await adminAiAgentsApi.toggle(slug, !enabled)
      toast.success(!enabled ? 'Agent réactivé.' : 'Agent désactivé.')
      setToggleTarget(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally {
      setBusySlug(null)
    }
  }

  if (loading) return <LoadingState label="Chargement des agents IA…" />
  if (error)   return <ErrorState message={error} onRetry={load} />

  const filtered = tier ? agents.filter(a => a.tier === tier) : agents
  const onlineCount   = agents.filter(a => a.status === 'online').length
  const callsToday    = agents.reduce((sum, a) => sum + a.calls_today, 0)
  const errorsToday   = agents.reduce((sum, a) => sum + a.errors_today, 0)

  return (
    <div>
      <PageHeader title="Agents IA" description="Santé, usage et coûts des 13 agents IA en temps réel" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard label="En ligne" value={`${onlineCount} / ${agents.length}`} icon={Activity}
          hint="Process ai-engine partagé — statut identique pour tous" />
        <StatsCard label="Appels aujourd'hui" value={callsToday.toLocaleString('fr-FR')} icon={Bot} />
        <StatsCard label="Erreurs aujourd'hui" value={errorsToday.toLocaleString('fr-FR')} icon={AlertTriangle} />
        <StatsCard label="Coût IA (30j)" value={`$${Number(costs.total_cost_30d).toLocaleString('fr-FR')}`} icon={DollarSign}
          hint={costs.paid_provider_configured ? 'Fournisseur payant configuré' : 'Aucun fournisseur payant — HuggingFace gratuit uniquement'} />
      </div>

      {!costs.paid_provider_configured && (
        <div className="flex items-start gap-2 bg-sky-500/5 border border-sky-500/15 rounded-xl px-4 py-2.5 mb-6 text-xs text-sky-300/80">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Tous les agents utilisent HuggingFace Inference API (gratuit) ou de l'inférence locale — aucun coût facturé à l'usage aujourd'hui.
            Les quotas d'appels IA par plan se règlent dans <Link to="/admin/plans" className="underline hover:text-sky-200">Plans</Link>.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={tier}
          onChange={e => setTier(e.target.value)}
          className="bg-[#12141A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {TIER_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-[#12141A]">{o.label}</option>)}
        </select>
      </div>

      <div className="bg-[#12141A] border border-white/8 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Bot} title="Aucun agent trouvé" description="Essayez d'ajuster le filtre de niveau." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left font-medium px-4 py-3">Agent</th>
                  <th className="text-left font-medium px-4 py-3">Niveau</th>
                  <th className="text-left font-medium px-4 py-3">Statut</th>
                  <th className="text-left font-medium px-4 py-3">Appels / erreurs (auj.)</th>
                  <th className="text-left font-medium px-4 py-3">Latence moy.</th>
                  <th className="text-left font-medium px-4 py-3">Dernière vérif.</th>
                  <th className="text-right font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.slug} className="border-b border-white/5">
                    <td className="px-4 py-3">
                      <Link to={`/admin/ai-agents/${a.slug}`} className="text-indigo-300 hover:text-indigo-200 font-medium">
                        {a.name}
                      </Link>
                      <p className="text-xs text-slate-500">{a.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400 capitalize">{a.tier}</td>
                    <td className="px-4 py-3"><HealthBadge status={a.enabled ? a.status : 'disabled'} /></td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className="text-slate-300">{a.calls_today}</span>
                      {a.errors_today > 0 && <span className="text-red-400"> · {a.errors_today} err.</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400 tabular-nums">{a.avg_latency_ms != null ? `${a.avg_latency_ms} ms` : '—'}</td>
                    <td className="px-4 py-3 text-slate-500 tabular-nums">
                      {a.last_seen ? new Date(a.last_seen).toLocaleTimeString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setToggleTarget({ slug: a.slug, name: a.name, enabled: a.enabled })}
                        disabled={busySlug === a.slug}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                          a.enabled
                            ? 'text-red-300 bg-red-500/10 hover:bg-red-500/20'
                            : 'text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20'
                        }`}
                      >
                        {a.enabled ? 'Désactiver' : 'Réactiver'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmationDialog
        open={!!toggleTarget}
        title={toggleTarget ? `${toggleTarget.enabled ? 'Désactiver' : 'Réactiver'} "${toggleTarget.name}" ?` : ''}
        description={
          toggleTarget?.enabled
            ? 'Tous les utilisateurs perdront immédiatement l\'accès à cet agent. Cette action est enregistrée dans le journal d\'audit.'
            : 'Les utilisateurs retrouveront immédiatement l\'accès à cet agent.'
        }
        confirmLabel={toggleTarget?.enabled ? 'Désactiver' : 'Réactiver'}
        loading={!!busySlug}
        onCancel={() => setToggleTarget(null)}
        onConfirm={confirmToggle}
      />
    </div>
  )
}
