// frontend/src/features/admin/ai-agents/AiAgentLogsPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { adminAiAgentsApi } from '@/api/admin/aiAgentsApi'
import { PageHeader } from '../components/PageHeader'
import { LoadingState } from '../components/LoadingState'
import { ErrorState } from '../components/ErrorState'
import { EmptyState } from '../components/EmptyState'
import { Pagination } from '../components/Pagination'

const LEVEL_OPTIONS = [
  { value: '', label: 'Tous les niveaux' },
  { value: 'error', label: 'Erreur' },
  { value: 'warning', label: 'Avertissement' },
  { value: 'info', label: 'Info' },
]

const LEVEL_STYLES = {
  error:   'bg-red-500/10 text-red-400 border-red-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  info:    'bg-sky-500/10 text-sky-400 border-sky-500/20',
}

const PER_PAGE = 30

export function AiAgentLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [agents, setAgents]   = useState([])
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [page, setPage]       = useState(1)

  const agentFilter = searchParams.get('agent') || ''
  const levelFilter = searchParams.get('level') || ''

  useEffect(() => {
    adminAiAgentsApi.list().then(res => setAgents(res.data.data.agents)).catch(() => {})
  }, [])

  const load = useCallback(() => {
    setLoading(true); setError(null)
    adminAiAgentsApi.logs({
      agent: agentFilter || undefined,
      level: levelFilter || undefined,
      page,
      per_page: PER_PAGE,
    })
      .then(res => setResult(res.data.data))
      .catch(() => setError('Impossible de charger les journaux.'))
      .finally(() => setLoading(false))
  }, [agentFilter, levelFilter, page])

  useEffect(() => { load() }, [load])

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value); else next.delete(key)
    setSearchParams(next)
    setPage(1)
  }

  return (
    <div>
      <Link to="/admin/ai-agents" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-4 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Retour aux agents IA
      </Link>

      <PageHeader title="Journaux techniques IA" description="Erreurs et événements des health checks, tous agents confondus" />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={agentFilter}
          onChange={e => setFilter('agent', e.target.value)}
          className="bg-[#12141A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="" className="bg-[#12141A]">Tous les agents</option>
          {agents.map(a => <option key={a.slug} value={a.slug} className="bg-[#12141A]">{a.name}</option>)}
        </select>
        <select
          value={levelFilter}
          onChange={e => setFilter('level', e.target.value)}
          className="bg-[#12141A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-[#12141A]">{o.label}</option>)}
        </select>
      </div>

      {loading && <LoadingState label="Chargement des journaux…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && (
        <div className="bg-[#12141A] border border-white/8 rounded-xl overflow-hidden">
          {result.logs.length === 0 ? (
            <EmptyState icon={FileText} title="Aucun journal trouvé" description="Essayez d'ajuster les filtres." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="text-left font-medium px-4 py-3">Niveau</th>
                      <th className="text-left font-medium px-4 py-3">Agent</th>
                      <th className="text-left font-medium px-4 py-3">Message</th>
                      <th className="text-left font-medium px-4 py-3">Durée</th>
                      <th className="text-left font-medium px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.logs.map(l => (
                      <tr key={l.id} className="border-b border-white/5 align-top">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${LEVEL_STYLES[l.level] || LEVEL_STYLES.info}`}>
                            {l.level}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{l.agent_name}</td>
                        <td className="px-4 py-3 text-slate-400 max-w-xl">{l.message}</td>
                        <td className="px-4 py-3 text-slate-500 tabular-nums">{l.duration_ms != null ? `${l.duration_ms} ms` : '—'}</td>
                        <td className="px-4 py-3 text-slate-500 tabular-nums whitespace-nowrap">{new Date(l.created_at).toLocaleString('fr-FR')}</td>
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
                  perPage={PER_PAGE}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
