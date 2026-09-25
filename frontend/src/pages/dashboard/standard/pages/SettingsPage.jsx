// frontend/src/pages/dashboard/standard/pages/SettingsPage.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Lock, Bell, CreditCard, Save, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { toast }   from 'sonner'
import api from '@/lib/axios'

const cn = (...c) => c.filter(Boolean).join(' ')

const TABS = [
  { id: 'profile',        label: 'Profil',        Icon: User       },
  { id: 'password',       label: 'Mot de passe',  Icon: Lock       },
  { id: 'notifications',  label: 'Notifications', Icon: Bell       },
  { id: 'plan',           label: 'Mon Plan',      Icon: CreditCard },
]

export default function SettingsPage() {
  const { user }       = useAuth()
  const queryClient    = useQueryClient()
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">⚙️ Paramètres</h1>
        <p className="text-sm text-gray-500 mt-1">Gérez votre compte et vos préférences</p>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex border-b border-gray-100">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors flex-1 justify-center',
                activeTab === tab.id
                  ? 'border-violet-600 text-violet-600 bg-violet-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'profile'       && <ProfileTab       user={user} queryClient={queryClient} />}
          {activeTab === 'password'      && <PasswordTab      />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'plan'          && <PlanTab          user={user} />}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PROFIL
// ══════════════════════════════════════════════════════════════
function ProfileTab({ user, queryClient }) {
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name : user?.last_name  || '',
    email     : user?.email      || '',
  })

  const mutation = useMutation({
    mutationFn: (data) => api.put('/user/profile', data),
    onSuccess : () => {
      toast.success('✅ Profil mis à jour !')
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
    onError: () => toast.error('Erreur lors de la mise à jour.'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-violet-700">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </span>
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900">{user?.full_name}</p>
          <p className="text-sm text-gray-400 capitalize">{user?.current_plan} · {user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Prénom</label>
          <input
            type="text"
            value={form.first_name}
            onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Nom</label>
          <input
            type="text"
            value={form.last_name}
            onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Adresse email</label>
        <input
          type="email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none"
          required
        />
      </div>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
      >
        <Save className="h-4 w-4" />
        {mutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
      </button>
    </form>
  )
}

// ══════════════════════════════════════════════════════════════
// MOT DE PASSE
// ══════════════════════════════════════════════════════════════
function PasswordTab() {
  const [form, setForm] = useState({
    current_password     : '',
    new_password         : '',
    new_password_confirmation: '',
  })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)

  const mutation = useMutation({
    mutationFn: (data) => api.put('/user/password', data),
    onSuccess : () => {
      toast.success('✅ Mot de passe mis à jour !')
      setForm({ current_password: '', new_password: '', new_password_confirmation: '' })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Erreur mot de passe.'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (form.new_password !== form.new_password_confirmation) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    mutation.mutate(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-sm">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Mot de passe actuel</label>
        <div className="relative">
          <input
            type={showCurrent ? 'text' : 'password'}
            value={form.current_password}
            onChange={e => setForm(f => ({ ...f, current_password: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none"
            required
          />
          <button type="button" onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Nouveau mot de passe</label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            value={form.new_password}
            onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none"
            minLength={8}
            required
          />
          <button type="button" onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Minimum 8 caractères</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirmer le nouveau mot de passe</label>
        <input
          type="password"
          value={form.new_password_confirmation}
          onChange={e => setForm(f => ({ ...f, new_password_confirmation: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none"
          required
        />
      </div>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
      >
        <Lock className="h-4 w-4" />
        {mutation.isPending ? 'Mise à jour...' : 'Changer le mot de passe'}
      </button>
    </form>
  )
}

// ══════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════════════════════════
function NotificationsTab() {
  const { data: prefs, isLoading } = useQuery({
    queryKey: ['notification-prefs'],
    queryFn : () => api.get('/user/notifications').then(r => r.data.data).catch(() => ({})),
  })

  const [local, setLocal] = useState(null)

  if (prefs && !local) setLocal({ ...prefs })

  const mutation = useMutation({
    mutationFn: (data) => api.put('/user/notifications', data),
    onSuccess : () => toast.success('✅ Préférences sauvegardées !'),
    onError   : () => toast.error('Erreur lors de la sauvegarde.'),
  })

  const toggle = (key) => setLocal(prev => ({ ...prev, [key]: !prev[key] }))

  if (isLoading) return (
    <div className="flex justify-center py-10">
      <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
    </div>
  )

  const settings = local || {
    email_weekly_report : true,
    email_post_published: true,
    email_inbox_summary : false,
    email_token_expiry  : true,
  }

  return (
    <div className="space-y-4">
      {[
        { key: 'email_weekly_report',  label: 'Rapport hebdomadaire',        desc: 'Recevez votre bilan chaque lundi' },
        { key: 'email_post_published', label: 'Confirmation de publication',  desc: 'Email quand un post est publié' },
        { key: 'email_inbox_summary',  label: 'Résumé de la messagerie',     desc: 'Résumé quotidien des commentaires' },
        { key: 'email_token_expiry',   label: 'Expiration des tokens',       desc: 'Alerte avant expiration du token Meta' },
      ].map(({ key, label, desc }) => (
        <div key={key} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50">
          <div>
            <p className="text-sm font-medium text-gray-800">{label}</p>
            <p className="text-xs text-gray-400">{desc}</p>
          </div>
          <div
            onClick={() => toggle(key)}
            className={cn(
              'relative w-11 h-6 rounded-full cursor-pointer transition-colors flex-shrink-0',
              settings[key] ? 'bg-violet-600' : 'bg-gray-200'
            )}
          >
            <div className={cn(
              'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
              settings[key] ? 'translate-x-6' : 'translate-x-1'
            )} />
          </div>
        </div>
      ))}

      <button
        onClick={() => mutation.mutate(settings)}
        disabled={mutation.isPending}
        className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors mt-2"
      >
        <Save className="h-4 w-4" />
        {mutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PLAN
// ══════════════════════════════════════════════════════════════
function PlanTab({ user }) {
  const isStandard = user?.current_plan === 'standard'

  return (
    <div className="space-y-5">

      {/* Plan actuel */}
      <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Plan actuel</p>
            <p className="text-xl font-bold text-gray-900 capitalize mt-0.5">{user?.current_plan || 'Standard'}</p>
          </div>
          <span className="bg-violet-600 text-white text-xs px-3 py-1 rounded-full font-medium">
            Actif
          </span>
        </div>
        <div className="space-y-1.5 text-xs text-gray-600">
          <p>✅ 2 comptes sociaux maximum</p>
          <p>✅ 6 agents IA (Planificateur, Légendes, Hashtags, Inbox, Rapports, Calendrier)</p>
          <p>✅ Rapport hebdomadaire automatique</p>
          <p>✅ Support par email</p>
        </div>
      </div>

      {/* Upgrade vers Professional */}
      {isStandard && (
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-5 text-white">
          <p className="text-xs font-medium opacity-80 uppercase tracking-wide mb-1">Passer au niveau supérieur</p>
          <p className="text-lg font-bold mb-2">Plan Professionnel 🚀</p>
          <div className="space-y-1 text-xs opacity-90 mb-4">
            <p>⭐ 13 agents IA avancés (Mistral 7B, Whisper, XGBoost…)</p>
            <p>⭐ Gestion multi-clients illimitée</p>
            <p>⭐ Optimisation publicitaire (Meta Ads + Google Ads)</p>
            <p>⭐ Veille concurrentielle IA</p>
            <p>⭐ Rapports PDF professionnels</p>
          </div>
          <button
            onClick={() => window.open('/upgrade', '_blank')}
            className="bg-white text-violet-600 px-5 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Passer au Pro →
          </button>
        </div>
      )}

      {/* Infos compte */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Informations du compte</h3>
        {[
          { label: 'Email',       value: user?.email       || '—' },
          { label: 'Membre depuis', value: user?.created_at
              ? new Date(user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
              : '—'
          },
          { label: 'Plan',        value: user?.current_plan ? user.current_plan.charAt(0).toUpperCase() + user.current_plan.slice(1) : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-xs font-medium text-gray-800">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}