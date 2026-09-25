// frontend/src/pages/dashboard/professional/settings/ProfessionalSettingsPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Lock, Bell, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { professionalApi } from '@/api/professionalApi'
import { authApi } from '@/api/auth'
import { subscriptionApi } from '@/api/subscription'

const TABS = [
  { id: 'profile',       label: 'Profil',        icon: User       },
  { id: 'password',      label: 'Mot de passe',  icon: Lock       },
  { id: 'notifications', label: 'Notifications', icon: Bell       },
  { id: 'subscription',  label: 'Abonnement',    icon: CreditCard },
]

const cn = (...c) => c.filter(Boolean).join(' ')

const inputCls = 'w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm placeholder-white/25 focus:ring-2 focus:ring-indigo-500 focus:outline-none'
const labelCls = 'block text-xs font-medium text-white/50 mb-1'

export default function ProfessionalSettingsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="min-h-screen bg-[#0F0F1A] p-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/dashboard/professional')}
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au dashboard
        </button>

        <h1 className="text-xl font-bold text-white mb-6">⚙️ Paramètres</h1>

        <div className="flex gap-1 border-b border-white/5 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-white/40 hover:text-white/70'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'profile'       && <ProfileTab />}
        {activeTab === 'password'      && <PasswordTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'subscription'  && <SubscriptionTab />}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PROFIL
// ══════════════════════════════════════════════════════════════
function ProfileTab() {
  const [form, setForm] = useState({ agency_name: '', professional_phone: '', website: '' })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    professionalApi.getOnboardingStatus()
      .then(r => {
        const p = r.data.data.profile
        setForm({
          agency_name       : p.agency_name || '',
          professional_phone: p.professional_phone || '',
          website            : p.website || '',
        })
      })
      .catch(() => toast.error('Impossible de charger le profil.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await professionalApi.updateProfile(form)
      toast.success('✅ Profil mis à jour.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-12 text-white/30 text-sm">Chargement...</div>

  return (
    <form onSubmit={handleSubmit} className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-6 space-y-4 max-w-lg">
      <div>
        <label className={labelCls}>Nom de l'agence</label>
        <input
          value={form.agency_name}
          onChange={e => setForm(f => ({ ...f, agency_name: e.target.value }))}
          placeholder="Ma Boutique SARL"
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Téléphone</label>
        <input
          value={form.professional_phone}
          onChange={e => setForm(f => ({ ...f, professional_phone: e.target.value }))}
          placeholder="+212 6 12 34 56 78"
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Site web</label>
        <input
          value={form.website}
          onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
          placeholder="https://ma-agence.com"
          className={inputCls}
        />
      </div>
      <button type="submit" disabled={saving}
        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </form>
  )
}

// ══════════════════════════════════════════════════════════════
// MOT DE PASSE
// ══════════════════════════════════════════════════════════════
function PasswordTab() {
  const [form, setForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.new_password !== form.new_password_confirmation) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    setSaving(true)
    try {
      await authApi.updatePassword(form)
      toast.success('✅ Mot de passe mis à jour.')
      setForm({ current_password: '', new_password: '', new_password_confirmation: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-6 space-y-4 max-w-lg">
      <div>
        <label className={labelCls}>Mot de passe actuel</label>
        <input type="password" required
          value={form.current_password}
          onChange={e => setForm(f => ({ ...f, current_password: e.target.value }))}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Nouveau mot de passe</label>
        <input type="password" required minLength={8}
          value={form.new_password}
          onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Confirmer le nouveau mot de passe</label>
        <input type="password" required minLength={8}
          value={form.new_password_confirmation}
          onChange={e => setForm(f => ({ ...f, new_password_confirmation: e.target.value }))}
          className={inputCls}
        />
      </div>
      <button type="submit" disabled={saving}
        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
        {saving ? 'Mise à jour...' : 'Changer le mot de passe'}
      </button>
    </form>
  )
}

// ══════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════════════════════════
const NOTIF_LABELS = {
  email_agent_activity : { label: 'Activité des agents IA',    hint: 'Résumé des tâches terminées et des erreurs' },
  email_weekly_summary : { label: 'Résumé hebdomadaire',        hint: 'Performance de vos clients chaque semaine' },
  email_billing         : { label: 'Facturation',                hint: 'Factures envoyées, payées ou en retard' },
  email_product_updates : { label: 'Nouveautés produit',         hint: 'Nouvelles fonctionnalités Social Mind AI' },
}

function NotificationsTab() {
  const [prefs,   setPrefs]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(null)

  useEffect(() => {
    authApi.getNotifications()
      .then(r => setPrefs(r.data.data.notifications))
      .catch(() => toast.error('Impossible de charger les préférences.'))
      .finally(() => setLoading(false))
  }, [])

  const toggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setSaving(key)
    try {
      await authApi.updateNotifications({ [key]: next[key] })
    } catch (err) {
      setPrefs(prefs) // rollback
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally {
      setSaving(null)
    }
  }

  if (loading || !prefs) return <div className="text-center py-12 text-white/30 text-sm">Chargement...</div>

  return (
    <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl divide-y divide-white/5 max-w-lg">
      {Object.entries(NOTIF_LABELS).map(([key, meta]) => (
        <div key={key} className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm font-medium text-white">{meta.label}</p>
            <p className="text-xs text-white/40 mt-0.5">{meta.hint}</p>
          </div>
          <button
            onClick={() => toggle(key)}
            disabled={saving === key}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50',
              prefs[key] ? 'bg-indigo-600' : 'bg-white/10'
            )}
          >
            <span className={cn(
              'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform',
              prefs[key] && 'translate-x-5'
            )} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ABONNEMENT
// ══════════════════════════════════════════════════════════════
function SubscriptionTab() {
  const navigate = useNavigate()
  const [sub,     setSub]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    subscriptionApi.getCurrent()
      .then(r => setSub(r.data.data.subscription))
      .catch(() => toast.error('Impossible de charger l\'abonnement.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-12 text-white/30 text-sm">Chargement...</div>

  if (!sub) {
    return (
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-6 max-w-lg text-center">
        <p className="text-sm text-white/50 mb-4">Aucun abonnement actif.</p>
        <button onClick={() => navigate('/upgrade')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors">
          Voir les plans
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-6 max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-white">{sub.plan?.name}</p>
          <p className="text-xs text-white/40 capitalize">{sub.status} · {sub.billing_cycle}</p>
        </div>
        {sub.is_trialing && (
          <span className="text-xs px-2.5 py-1 bg-amber-400/10 text-amber-400 rounded-full">Essai</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {sub.next_billing_at && (
          <div>
            <p className="text-white/40 text-xs">Prochaine facturation</p>
            <p className="text-white">{new Date(sub.next_billing_at).toLocaleDateString('fr-FR')}</p>
          </div>
        )}
        {sub.next_billing_amount && (
          <div>
            <p className="text-white/40 text-xs">Montant</p>
            <p className="text-white">{sub.next_billing_amount}€</p>
          </div>
        )}
        {sub.days_remaining != null && (
          <div>
            <p className="text-white/40 text-xs">Jours restants</p>
            <p className="text-white">{sub.days_remaining}</p>
          </div>
        )}
      </div>

      <button onClick={() => navigate('/upgrade')}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors">
        Changer de plan
      </button>
    </div>
  )
}
