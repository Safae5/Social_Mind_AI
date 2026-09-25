// frontend/src/features/admin/plans/PlansPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Archive, Pencil } from 'lucide-react'
import { adminPlansApi } from '@/api/admin/subscriptionsApi'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { LoadingState } from '../components/LoadingState'
import { ErrorState } from '../components/ErrorState'
import { ConfirmationDialog } from '../components/ConfirmationDialog'

const EMPTY_FORM = {
  name: '', slug: '', description: '', type: 'standard',
  price_monthly: '', price_yearly: '', features: '', limits: '',
}

export function PlansPage() {
  const [plans, setPlans]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [busy, setBusy]       = useState(false)

  const [formOpen, setFormOpen]   = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [archiveTarget, setArchiveTarget] = useState(null)

  const load = useCallback(() => {
    setLoading(true); setError(null)
    adminPlansApi.list()
      .then(r => setPlans(r.data.data.plans))
      .catch(() => setError('Impossible de charger les plans.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditingPlan(null); setForm(EMPTY_FORM); setFormOpen(true) }
  const openEdit = (plan) => {
    setEditingPlan(plan)
    setForm({
      name: plan.name, slug: plan.slug, description: plan.description || '', type: plan.type,
      price_monthly: plan.price_monthly, price_yearly: plan.price_yearly,
      features: (plan.features || []).join(', '),
      limits: JSON.stringify(plan.limits || {}, null, 2),
    })
    setFormOpen(true)
  }

  const submitForm = async () => {
    setBusy(true)
    try {
      let limits = {}
      try { limits = form.limits ? JSON.parse(form.limits) : {} }
      catch { toast.error('Limites : JSON invalide.'); setBusy(false); return }

      const payload = {
        name: form.name, description: form.description,
        price_monthly: parseFloat(form.price_monthly) || 0,
        price_yearly: parseFloat(form.price_yearly) || 0,
        features: form.features.split(',').map(f => f.trim()).filter(Boolean),
        limits,
      }

      if (editingPlan) {
        await adminPlansApi.update(editingPlan.id, payload)
        toast.success('Plan mis à jour.')
      } else {
        await adminPlansApi.create({ ...payload, slug: form.slug, type: form.type })
        toast.success('Plan créé.')
      }
      setFormOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally {
      setBusy(false)
    }
  }

  const confirmArchive = async () => {
    setBusy(true)
    try {
      await adminPlansApi.archive(archiveTarget.id)
      toast.success('Plan archivé.')
      setArchiveTarget(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState label="Chargement des plans…" />
  if (error)   return <ErrorState message={error} onRetry={load} />

  return (
    <div>
      <PageHeader
        title="Plans"
        description="Configuration des offres — prix, features, quotas"
        actions={
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">
            <Plus className="h-4 w-4" /> Nouveau plan
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map(plan => (
          <div key={plan.id} className="bg-[#12141A] border border-white/8 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-white">{plan.name}</h3>
                <p className="text-xs text-slate-500">{plan.slug} · {plan.type}</p>
              </div>
              <StatusBadge status={plan.is_active ? 'active' : 'inactive'} />
            </div>
            <p className="text-lg font-semibold text-white mb-1">
              ${plan.price_monthly}<span className="text-xs text-slate-500 font-normal">/mo</span>
              <span className="text-xs text-slate-500 font-normal"> · ${plan.price_yearly}/an</span>
            </p>
            {plan.description && <p className="text-xs text-slate-500 mb-3">{plan.description}</p>}
            <div className="flex flex-wrap gap-1 mb-3">
              {(plan.features || []).slice(0, 4).map(f => (
                <span key={f} className="text-[10px] px-1.5 py-0.5 bg-white/5 text-slate-400 rounded">{f}</span>
              ))}
              {(plan.features || []).length > 4 && (
                <span className="text-[10px] px-1.5 py-0.5 text-slate-500">+{plan.features.length - 4}</span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(plan)}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs border border-white/10 text-slate-300 hover:bg-white/5 rounded-lg transition-colors">
                <Pencil className="h-3 w-3" /> Modifier
              </button>
              {plan.is_active && (
                <button onClick={() => setArchiveTarget(plan)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                  <Archive className="h-3 w-3" /> Archiver
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {formOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#14161D] border border-white/10 rounded-xl p-5 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-4">{editingPlan ? 'Modifier le plan' : 'Nouveau plan'}</h3>
            <div className="space-y-3">
              <Field label="Nom">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[#0D0F14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
              </Field>
              {!editingPlan && (
                <>
                  <Field label="Slug (identifiant unique)">
                    <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                      className="w-full bg-[#0D0F14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                  </Field>
                  <Field label="Type">
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full bg-[#0D0F14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                      <option value="standard" className="bg-[#0D0F14]">standard</option>
                      <option value="business" className="bg-[#0D0F14]">business</option>
                    </select>
                  </Field>
                </>
              )}
              <Field label="Description">
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-[#0D0F14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prix mensuel ($)">
                  <input type="number" step="0.01" value={form.price_monthly} onChange={e => setForm(f => ({ ...f, price_monthly: e.target.value }))}
                    className="w-full bg-[#0D0F14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                </Field>
                <Field label="Prix annuel ($)">
                  <input type="number" step="0.01" value={form.price_yearly} onChange={e => setForm(f => ({ ...f, price_yearly: e.target.value }))}
                    className="w-full bg-[#0D0F14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                </Field>
              </div>
              <Field label="Features (séparées par des virgules)">
                <input value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
                  className="w-full bg-[#0D0F14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
              </Field>
              <Field label="Limites (JSON)">
                <textarea rows={3} value={form.limits} onChange={e => setForm(f => ({ ...f, limits: e.target.value }))}
                  className="w-full bg-[#0D0F14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono text-xs" />
              </Field>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setFormOpen(false)} className="px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 rounded-lg">Annuler</button>
              <button onClick={submitForm} disabled={busy}
                className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg disabled:opacity-50">
                {busy ? '…' : editingPlan ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={!!archiveTarget}
        title={`Archiver "${archiveTarget?.name}" ?`}
        description="Le plan ne sera plus proposé aux nouveaux clients. Bloqué si des abonnements actifs y sont encore rattachés."
        confirmLabel="Archiver"
        loading={busy}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
      />
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  )
}
