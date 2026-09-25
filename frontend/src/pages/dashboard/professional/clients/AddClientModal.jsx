// frontend/src/pages/dashboard/professional/clients/AddClientModal.jsx
import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { professionalApi } from '@/api/professionalApi'

const PLATFORMS_OPTIONS = ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'Twitter/X', 'Google Ads', 'Meta Ads']
const SERVICES_OPTIONS  = ['Social Media Management', 'Content Creation', 'Paid Ads', 'Meta Ads', 'Google Ads', 'Community Management', 'Analytics']
const AGENTS_OPTIONS    = [
  { slug: 'account-manager',   label: '🎯 Chef de Compte'             },
  { slug: 'social-manager',    label: '📱 Gestionnaire RS'            },
  { slug: 'content-strategy',  label: '📊 Stratège Contenu'           },
  { slug: 'content-creator',   label: '✨ Créateur Contenu IA'         },
  { slug: 'analytics',         label: '📈 Analytics IA'               },
  { slug: 'ad-optimizer',      label: '💰 Optimisation Publicitaire'  },
  { slug: 'competitive-intel', label: '🔍 Veille Concurrentielle'     },
]

const cn = (...c) => c.filter(Boolean).join(' ')

export function AddClientModal({ onClose, onAdded }) {
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    name             : '',
    company_name     : '',
    email            : '',
    phone            : '',
    website          : '',
    country          : '',
    city             : '',
    industry         : '',
    niche            : '',
    contract_type    : 'monthly_retainer',
    contract_start   : '',
    monthly_retainer : '',
    currency         : 'EUR',
    services         : [],
    platforms        : [],
    assigned_agents  : [],
    status           : 'active',
    notes            : '',
  })

  const toggle = (field, value) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter(v => v !== value)
        : [...f[field], value],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Le nom du client est requis.')
      return
    }
    setIsSaving(true)
    try {
      await professionalApi.createClient(form)
      toast.success('✅ Client ajouté !')
      onAdded()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de création.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-[#1A1A2E]">
          <h2 className="text-lg font-bold text-white">Ajouter un client</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-white/40">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Nom du contact *', key: 'name',         placeholder: 'Khalid Amrani' },
              { label: 'Entreprise',        key: 'company_name', placeholder: 'Ma Boutique SARL' },
              { label: 'Email',             key: 'email',        placeholder: 'contact@exemple.com', type: 'email' },
              { label: 'Téléphone',         key: 'phone',        placeholder: '+212 6 12 34 56 78' },
              { label: 'Site web',          key: 'website',      placeholder: 'https://ma-boutique.com' },
              { label: 'Pays',              key: 'country',      placeholder: 'Maroc' },
              { label: 'Ville',             key: 'city',         placeholder: 'Casablanca' },
              { label: 'Niche/Secteur',     key: 'niche',        placeholder: 'Mode marocaine' },
            ].map(({ label, key, placeholder, type = 'text' }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-white/50 mb-1">{label}</label>
                <input
                  type={type} value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm placeholder-white/25 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            ))}
          </div>

          {/* Contrat */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Type de contrat</label>
              <select
                value={form.contract_type}
                onChange={e => setForm(f => ({ ...f, contract_type: e.target.value }))}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
              >
                {['monthly_retainer', 'project_based', 'hourly', 'performance_based'].map(t => (
                  <option key={t} value={t} className="bg-slate-800">{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Retainer mensuel (€)</label>
              <input type="number" min={0}
                value={form.monthly_retainer}
                onChange={e => setForm(f => ({ ...f, monthly_retainer: e.target.value }))}
                placeholder="2500"
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Date début</label>
              <input type="date"
                value={form.contract_start}
                onChange={e => setForm(f => ({ ...f, contract_start: e.target.value }))}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Statut</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
              >
                {['active', 'prospect', 'paused'].map(s => (
                  <option key={s} value={s} className="bg-slate-800">{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Plateformes */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-2">Plateformes à gérer</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS_OPTIONS.map(p => (
                <button key={p} type="button"
                  onClick={() => toggle('platforms', p)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs border transition-all',
                    form.platforms.includes(p)
                      ? 'border-blue-500 bg-blue-500/20 text-white'
                      : 'border-white/15 bg-white/5 text-white/40 hover:border-white/30'
                  )}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Agents IA assignés */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-2">Agents IA assignés</label>
            <div className="flex flex-wrap gap-2">
              {AGENTS_OPTIONS.map(a => (
                <button key={a.slug} type="button"
                  onClick={() => toggle('assigned_agents', a.slug)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs border transition-all',
                    form.assigned_agents.includes(a.slug)
                      ? 'border-indigo-500 bg-indigo-500/20 text-white'
                      : 'border-white/15 bg-white/5 text-white/40 hover:border-white/30'
                  )}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">Notes internes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notes sur le client, objectifs, contexte..."
              rows={2}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-white/25"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSaving}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
              {isSaving ? '⏳ Création...' : '✅ Créer le client'}
            </button>
            <button type="button" onClick={onClose}
              className="px-6 py-3 border border-white/10 text-white/60 rounded-xl text-sm hover:bg-white/5">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}