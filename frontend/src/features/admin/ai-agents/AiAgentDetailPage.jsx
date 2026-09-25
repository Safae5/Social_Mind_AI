// frontend/src/features/admin/ai-agents/AiAgentDetailPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, AlertTriangle, Settings2, FileText, Activity } from 'lucide-react'
import { adminAiAgentsApi } from '@/api/admin/aiAgentsApi'
import { PageHeader } from '../components/PageHeader'
import { StatsCard } from '../components/StatsCard'
import { LoadingState } from '../components/LoadingState'
import { ErrorState } from '../components/ErrorState'
import { EmptyState } from '../components/EmptyState'
import { ConfirmationDialog } from '../components/ConfirmationDialog'

const LEVEL_STYLES = {
  error:   'bg-red-500/10 text-red-400 border-red-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  info:    'bg-sky-500/10 text-sky-400 border-sky-500/20',
}

const ACTIVITY_STYLES = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  error:   'bg-red-500/10 text-red-400 border-red-500/20',
  running: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  pending: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

function Pill({ value, styles }) {
  const cls = styles[value] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{value}</span>
}

function UsageTrendChart({ trend }) {
  if (!trend?.length) {
    return <EmptyState icon={Activity} title="Aucun appel sur les 30 derniers jours" />
  }
  const max = Math.max(1, ...trend.map(d => Number(d.total_calls)))
  return (
    <div className="flex items-end gap-1 h-32 px-1">
      {trend.map(d => {
        const h = Math.max(2, Math.round((Number(d.total_calls) / max) * 100))
        const hasErrors = Number(d.failed_calls) > 0
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
            <div
              title={`${d.date} — ${d.total_calls} appel(s)${hasErrors ? `, ${d.failed_calls} échec(s)` : ''}`}
              className={`w-full rounded-sm transition-colors ${hasErrors ? 'bg-red-500/50 group-hover:bg-red-500/70' : 'bg-indigo-500/50 group-hover:bg-indigo-500/70'}`}
              style={{ height: `${h}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}

export function AiAgentDetailPage() {
  const { slug } = useParams()
  const [data, setData]         = useState(null)
  const [config, setConfig]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [busy, setBusy]         = useState(false)
  const [toggleOpen, setToggleOpen] = useState(false)
  const [configDialog, setConfigDialog] = useState(false)
  const [configKey, setConfigKey]       = useState('')
  const [desiredValue, setDesiredValue] = useState('')

  const load = useCallback(() => {
    setLoading(true); setError(null)
    Promise.all([adminAiAgentsApi.show(slug), adminAiAgentsApi.getConfig(slug)])
      .then(([s, c]) => { setData(s.data.data); setConfig(c.data.data.config) })
      .catch(() => setError('Impossible de charger cet agent.'))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => { load() }, [load])

  const runToggle = async () => {
    setBusy(true)
    try {
      await adminAiAgentsApi.toggle(slug, !data.status.enabled)
      toast.success(data.status.enabled ? 'Agent désactivé.' : 'Agent réactivé.')
      setToggleOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally {
      setBusy(false)
    }
  }

  const submitConfig = async () => {
    if (!configKey.trim() || !desiredValue.trim()) return
    setBusy(true)
    try {
      const res = await adminAiAgentsApi.updateConfig(slug, configKey.trim(), desiredValue.trim())
      toast.success(res.data.message || 'Configuration enregistrée.')
      setConfigDialog(false); setConfigKey(''); setDesiredValue('')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState label="Chargement de l'agent…" />
  if (error)   return <ErrorState message={error} onRetry={load} />

  const { agent, status, usage_trend_30d, recent_logs, recent_activity } = data

  return (
    <div>
      <Link to="/admin/ai-agents" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-4 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Retour aux agents IA
      </Link>

      <PageHeader
        title={agent.name}
        description={`${agent.slug} · niveau ${agent.tier} · /${agent.health_path}`}
        actions={
          <button
            onClick={() => setToggleOpen(true)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              status.enabled
                ? 'text-red-300 bg-red-500/10 hover:bg-red-500/20'
                : 'text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20'
            }`}
          >
            {status.enabled ? 'Désactiver l\'agent' : 'Réactiver l\'agent'}
          </button>
        }
      />

      {status.last_error && (
        <div className="flex items-start gap-2 bg-red-500/5 border border-red-500/15 rounded-xl px-4 py-2.5 mb-6 text-xs text-red-300/80">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>Dernière erreur de santé : {status.last_error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard label="Statut" value={status.enabled ? (status.status === 'online' ? 'En ligne' : 'Indisponible') : 'Désactivé'} icon={Activity} />
        <StatsCard label="Latence (dernier check)" value={status.latency_ms != null ? `${status.latency_ms} ms` : '—'} />
        <StatsCard label="Dernière vérification" value={status.last_seen ? new Date(status.last_seen).toLocaleString('fr-FR') : '—'} />
        <StatsCard label="Appels (30j)" value={usage_trend_30d.reduce((s, d) => s + Number(d.total_calls), 0).toLocaleString('fr-FR')} />
      </div>

      <div className="bg-[#12141A] border border-white/8 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-semibold text-white mb-1">Appels par jour (30j)</h3>
        <p className="text-xs text-slate-500 mb-3">Barres rouges = jours avec au moins un échec</p>
        <UsageTrendChart trend={usage_trend_30d} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-[#12141A] border border-white/8 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/8">
            <h3 className="text-sm font-semibold text-white">Activité récente</h3>
          </div>
          {recent_activity.length === 0 ? (
            <EmptyState icon={Activity} title="Aucune activité récente" />
          ) : (
            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
              {recent_activity.map(a => (
                <div key={a.id} className="px-4 py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-slate-300 font-medium">{a.action}</span>
                    <Pill value={a.status} styles={ACTIVITY_STYLES} />
                  </div>
                  {a.description && <p className="text-xs text-slate-500">{a.description}</p>}
                  {a.error_message && <p className="text-xs text-red-400/80 mt-0.5">{a.error_message}</p>}
                  <p className="text-[11px] text-slate-600 mt-1 tabular-nums">{new Date(a.created_at).toLocaleString('fr-FR')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#12141A] border border-white/8 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Journaux techniques</h3>
            <Link to={`/admin/ai-agents/logs?agent=${agent.slug}`} className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Tout voir
            </Link>
          </div>
          {recent_logs.length === 0 ? (
            <EmptyState icon={FileText} title="Aucun journal récent" />
          ) : (
            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
              {recent_logs.map(l => (
                <div key={l.id} className="px-4 py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <Pill value={l.level} styles={LEVEL_STYLES} />
                    {l.duration_ms != null && <span className="text-xs text-slate-500 tabular-nums">{l.duration_ms} ms</span>}
                  </div>
                  <p className="text-xs text-slate-400">{l.message}</p>
                  <p className="text-[11px] text-slate-600 mt-1 tabular-nums">{new Date(l.created_at).toLocaleString('fr-FR')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#12141A] border border-white/8 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5" /> Configuration modèle
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Un changement ici nécessite une mise à jour de ai-engine/.env et un redémarrage du process — pas de hot-swap dans cette architecture.
            </p>
          </div>
          <button
            onClick={() => setConfigDialog(true)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex-shrink-0"
          >
            Nouveau paramètre
          </button>
        </div>
        {config.length === 0 ? (
          <EmptyState icon={Settings2} title="Aucun paramètre configuré pour cet agent" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-xs text-slate-500 uppercase tracking-wide">
                <th className="text-left font-medium px-4 py-2.5">Clé</th>
                <th className="text-left font-medium px-4 py-2.5">Valeur souhaitée</th>
                <th className="text-left font-medium px-4 py-2.5">Appliqué</th>
                <th className="text-left font-medium px-4 py-2.5">Mis à jour</th>
              </tr>
            </thead>
            <tbody>
              {config.map(c => (
                <tr key={c.id} className="border-b border-white/5">
                  <td className="px-4 py-2.5 text-slate-300 font-mono text-xs">{c.config_key}</td>
                  <td className="px-4 py-2.5 text-white font-mono text-xs">{c.desired_value}</td>
                  <td className="px-4 py-2.5">
                    <Pill value={c.applied ? 'success' : 'pending'} styles={ACTIVITY_STYLES} />
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs tabular-nums">{new Date(c.updated_at).toLocaleString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmationDialog
        open={toggleOpen}
        title={`${status.enabled ? 'Désactiver' : 'Réactiver'} "${agent.name}" ?`}
        description={
          status.enabled
            ? 'Tous les utilisateurs perdront immédiatement l\'accès à cet agent. Cette action est enregistrée dans le journal d\'audit.'
            : 'Les utilisateurs retrouveront immédiatement l\'accès à cet agent.'
        }
        confirmLabel={status.enabled ? 'Désactiver' : 'Réactiver'}
        loading={busy}
        onCancel={() => setToggleOpen(false)}
        onConfirm={runToggle}
      />

      {configDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#14161D] border border-white/10 rounded-xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-1">Nouveau paramètre de configuration</h3>
            <p className="text-xs text-slate-500 mb-4">Enregistré comme « souhaité » — n'est pas appliqué automatiquement.</p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Clé (ex : whisper_model_size)</label>
                <input
                  value={configKey}
                  onChange={e => setConfigKey(e.target.value)}
                  className="w-full bg-[#0D0F14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="config_key"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Valeur souhaitée</label>
                <input
                  value={desiredValue}
                  onChange={e => setDesiredValue(e.target.value)}
                  className="w-full bg-[#0D0F14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="ex : medium"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfigDialog(false)} className="px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 rounded-lg transition-colors">
                Annuler
              </button>
              <button
                onClick={submitConfig}
                disabled={!configKey.trim() || !desiredValue.trim() || busy}
                className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-40"
              >
                {busy ? '…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
