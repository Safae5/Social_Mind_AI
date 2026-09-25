// frontend/src/features/admin/users/UserDetailPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, ShieldAlert, Ban, KeyRound, Trash2, PlayCircle, PauseCircle, CreditCard, Tag } from 'lucide-react'
import { adminUsersApi } from '@/api/admin/usersApi'
import { adminSubscriptionsApi, adminPlansApi } from '@/api/admin/subscriptionsApi'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { LoadingState } from '../components/LoadingState'
import { ErrorState } from '../components/ErrorState'
import { EmptyState } from '../components/EmptyState'
import { ConfirmationDialog } from '../components/ConfirmationDialog'
import { DangerConfirmationDialog } from '../components/DangerConfirmationDialog'

const ROLES = ['standard', 'business', 'admin']

export function UserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [busy, setBusy]       = useState(false)

  const [roleDialog, setRoleDialog]     = useState(null) // nouveau rôle en attente de confirmation
  const [banDialog, setBanDialog]       = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [resetDialog, setResetDialog]   = useState(false)
  const [plans, setPlans]               = useState([])
  const [planDialog, setPlanDialog]     = useState(false)
  const [planSlug, setPlanSlug]         = useState('')
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [promoDialog, setPromoDialog]   = useState(false)
  const [promoCode, setPromoCode]       = useState('')

  useEffect(() => { adminPlansApi.list().then(r => setPlans(r.data.data.plans.filter(p => p.is_active))).catch(() => {}) }, [])

  const load = useCallback(() => {
    setLoading(true); setError(null)
    adminUsersApi.get(id)
      .then(r => setData(r.data.data))
      .catch(() => setError('Impossible de charger cet utilisateur.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  const runAction = async (fn, successMsg) => {
    setBusy(true)
    try {
      await fn()
      toast.success(successMsg)
      load()
      return true
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
      return false
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState label="Chargement du profil…" />
  if (error)    return <ErrorState message={error} onRetry={load} />
  if (!data)    return null

  const { user, subscription, usage_stats, social_accounts, login_history, admin_history } = data

  return (
    <div>
      <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-4 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Retour aux utilisateurs
      </Link>

      <PageHeader
        title={user.full_name}
        description={user.email}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={user.role} kind="role" />
            <StatusBadge status={user.status} />
          </div>
        }
      />

      {/* ── Actions ── */}
      <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-white/8">
        <select
          value={user.role}
          onChange={e => setRoleDialog(e.target.value)}
          disabled={busy}
          className="bg-[#12141A] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {ROLES.map(r => <option key={r} value={r} className="bg-[#12141A]">Rôle : {r}</option>)}
        </select>

        {user.status === 'suspended' ? (
          <ActionButton icon={PlayCircle} label="Réactiver" onClick={() =>
            runAction(() => adminUsersApi.unsuspend(id), 'Compte réactivé.')
          } />
        ) : (
          <ActionButton icon={PauseCircle} label="Suspendre" onClick={() =>
            runAction(() => adminUsersApi.suspend(id, 'Suspendu depuis le panneau admin'), 'Compte suspendu.')
          } />
        )}

        <ActionButton icon={Ban} label="Bannir" danger onClick={() => setBanDialog(true)} />
        <ActionButton icon={KeyRound} label="Réinitialiser le mot de passe" onClick={() => setResetDialog(true)} />
        <ActionButton icon={Trash2} label="Supprimer (RGPD)" danger onClick={() => setDeleteDialog(true)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Infos compte ── */}
        <Section title="Compte">
          <Field label="E-mail vérifié" value={user.email_verified ? 'Oui' : 'Non'} />
          <Field label="2FA activée" value={user.two_factor_enabled ? 'Oui' : 'Non'} />
          <Field label="Inscrit le" value={user.created_at ? new Date(user.created_at).toLocaleString('fr-FR') : '—'} />
          <Field label="Dernière connexion" value={user.last_login_at ? new Date(user.last_login_at).toLocaleString('fr-FR') : 'Jamais'} />
          <Field label="Nombre de connexions" value={user.login_count ?? 0} />
          <Field label="Dernière IP" value={user.last_login_ip || '—'} />
        </Section>

        {/* ── Abonnement ── */}
        <Section title="Abonnement">
          {subscription ? (
            <>
              <Field label="Plan" value={subscription.plan || '—'} />
              <Field label="Statut" value={subscription.status} />
              <Field label="Renouvellement auto" value={subscription.auto_renew ? 'Oui' : 'Non'} />
              <Field label="Se termine le" value={subscription.ends_at ? new Date(subscription.ends_at).toLocaleDateString('fr-FR') : '—'} />
            </>
          ) : (
            <p className="text-sm text-slate-500 mb-3">Aucun abonnement actif.</p>
          )}
          <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
            <ActionButton icon={CreditCard} label="Changer de plan" onClick={() => setPlanDialog(true)} />
            <ActionButton icon={Tag} label="Code promo" onClick={() => setPromoDialog(true)} />
          </div>
        </Section>

        {/* ── Utilisation agents IA ── */}
        <Section title="Utilisation des agents IA">
          {usage_stats?.length > 0 ? (
            <table className="w-full text-sm">
              <tbody>
                {usage_stats.map(s => (
                  <tr key={s.agent_slug} className="border-b border-white/5 last:border-0">
                    <td className="py-1.5 text-slate-300">{s.agent_slug}</td>
                    <td className="py-1.5 text-right text-slate-500 tabular-nums">{s.successful}/{s.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-500">Aucune activité enregistrée.</p>
          )}
        </Section>

        {/* ── Comptes sociaux ── */}
        <Section title="Comptes sociaux connectés">
          {social_accounts?.length > 0 ? (
            <div className="space-y-1.5">
              {social_accounts.map(a => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{a.platform} · {a.platform_username || '—'}</span>
                  <StatusBadge status={a.is_active && a.token_valid ? 'active' : 'inactive'} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Aucun compte connecté.</p>
          )}
        </Section>

        {/* ── Historique connexions ── */}
        <Section title="Historique des connexions">
          {login_history?.length > 0 ? (
            <div className="space-y-2">
              {login_history.map(s => (
                <div key={s.id} className="text-sm">
                  <p className="text-slate-300">{s.device_name || s.device_type || 'Appareil inconnu'} · {s.browser} / {s.os}</p>
                  <p className="text-xs text-slate-500">{s.ip_address} {s.location ? `· ${s.location}` : ''} · {s.last_active_at ? new Date(s.last_active_at).toLocaleString('fr-FR') : ''}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Aucune session enregistrée.</p>
          )}
        </Section>

        {/* ── Historique admin ── */}
        <Section title="Historique administratif">
          {admin_history?.length > 0 ? (
            <div className="space-y-2">
              {admin_history.map(h => (
                <div key={h.id} className="text-sm">
                  <p className="text-slate-300">
                    <span className="font-medium">{h.admin || 'Admin'}</span> — {h.action}
                  </p>
                  <p className="text-xs text-slate-500">{h.created_at ? new Date(h.created_at).toLocaleString('fr-FR') : ''}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={ShieldAlert} title="Aucune action administrative" description="Aucune action n'a encore été effectuée sur ce compte." />
          )}
        </Section>
      </div>

      {/* ── Dialogs ── */}
      <ConfirmationDialog
        open={!!roleDialog}
        title={`Changer le rôle en "${roleDialog}" ?`}
        description="Cette action est enregistrée dans le journal d'audit."
        confirmLabel="Changer le rôle"
        loading={busy}
        onCancel={() => setRoleDialog(null)}
        onConfirm={async () => {
          const ok = await runAction(() => adminUsersApi.changeRole(id, roleDialog), 'Rôle modifié.')
          if (ok) setRoleDialog(null)
        }}
      />

      <DangerConfirmationDialog
        open={banDialog}
        title="Bannir ce compte définitivement ?"
        description="L'utilisateur perd immédiatement l'accès à la plateforme. Nécessite une vérification 2FA récente."
        confirmLabel="Bannir"
        loading={busy}
        onCancel={() => setBanDialog(false)}
        onConfirm={async (reason) => {
          const ok = await runAction(() => adminUsersApi.ban(id, reason), 'Compte banni.')
          if (ok) setBanDialog(false)
        }}
      />

      <DangerConfirmationDialog
        open={deleteDialog}
        title="Supprimer ce compte (droit à l'effacement RGPD) ?"
        description="Les données personnelles seront anonymisées et le compte désactivé. Traitement en arrière-plan, irréversible. Nécessite une vérification 2FA récente."
        confirmLabel="Supprimer"
        loading={busy}
        onCancel={() => setDeleteDialog(false)}
        onConfirm={async () => {
          const ok = await runAction(() => adminUsersApi.requestDeletion(id), 'Demande de suppression RGPD enregistrée.')
          if (ok) { setDeleteDialog(false); navigate('/admin/users') }
        }}
      />

      <ConfirmationDialog
        open={resetDialog}
        title="Envoyer un e-mail de réinitialisation ?"
        description="Un lien de réinitialisation de mot de passe sera envoyé à l'utilisateur."
        confirmLabel="Envoyer"
        loading={busy}
        onCancel={() => setResetDialog(false)}
        onConfirm={async () => {
          const ok = await runAction(() => adminUsersApi.triggerPasswordReset(id), 'E-mail envoyé.')
          if (ok) setResetDialog(false)
        }}
      />

      {planDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#14161D] border border-white/10 rounded-xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-4">Changer de plan</h3>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nouveau plan</label>
                <select value={planSlug} onChange={e => setPlanSlug(e.target.value)}
                  className="w-full bg-[#0D0F14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="" className="bg-[#0D0F14]">Sélectionner…</option>
                  {plans.map(p => <option key={p.slug} value={p.slug} className="bg-[#0D0F14]">{p.name} ({p.type})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Cycle de facturation</label>
                <select value={billingCycle} onChange={e => setBillingCycle(e.target.value)}
                  className="w-full bg-[#0D0F14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="monthly" className="bg-[#0D0F14]">Mensuel</option>
                  <option value="yearly" className="bg-[#0D0F14]">Annuel</option>
                </select>
              </div>
              <p className="text-xs text-slate-500">
                Si l'utilisateur a un abonnement Stripe réel, il sera modifié directement (proratisé).
                Sinon, un accès est accordé manuellement sans passer par un paiement.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPlanDialog(false)} className="px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 rounded-lg">Annuler</button>
              <button
                onClick={async () => {
                  if (!planSlug) return
                  const ok = await runAction(() => adminSubscriptionsApi.changePlan(id, planSlug, billingCycle), 'Plan modifié.')
                  if (ok) { setPlanDialog(false); setPlanSlug('') }
                }}
                disabled={!planSlug || busy}
                className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg disabled:opacity-40"
              >
                {busy ? '…' : 'Changer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {promoDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#14161D] border border-white/10 rounded-xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-4">Appliquer un code promo</h3>
            <input
              value={promoCode}
              onChange={e => setPromoCode(e.target.value)}
              placeholder="CODE PROMO"
              className="w-full bg-[#0D0F14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white mb-2"
            />
            <p className="text-xs text-slate-500 mb-5">
              Ne s'applique qu'aux abonnements réellement facturés via Stripe.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPromoDialog(false)} className="px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 rounded-lg">Annuler</button>
              <button
                onClick={async () => {
                  if (!promoCode.trim()) return
                  const ok = await runAction(() => adminSubscriptionsApi.applyPromotion(id, promoCode.trim()), 'Code promo appliqué.')
                  if (ok) { setPromoDialog(false); setPromoCode('') }
                }}
                disabled={!promoCode.trim() || busy}
                className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg disabled:opacity-40"
              >
                {busy ? '…' : 'Appliquer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-[#12141A] border border-white/8 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  )
}

function ActionButton({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
        danger
          ? 'border-red-500/20 text-red-400 hover:bg-red-500/10'
          : 'border-white/10 text-slate-300 hover:bg-white/5'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
