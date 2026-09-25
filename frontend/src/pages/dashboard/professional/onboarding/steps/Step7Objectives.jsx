// Step7Objectives.jsx
import { useState } from 'react'

const OBJECTIVE_TYPES = [
  { id: 'client_acquisition',     label: '🎯 Acquisition clients'       },
  { id: 'client_retention',       label: '🔒 Rétention clients'         },
  { id: 'revenue_growth',         label: '📈 Croissance revenus'        },
  { id: 'team_expansion',         label: '👥 Expansion équipe'          },
  { id: 'market_positioning',     label: '🌍 Positionnement marché'     },
  { id: 'agency_automation',      label: '🤖 Automatisation agence'     },
  { id: 'content_scaling',        label: '📱 Scale contenu clients'     },
  { id: 'advertising_performance',label: '💰 Performance publicitaire'  },
]

const PRIORITY_PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'Google Ads', 'Meta Ads']

const cn = (...c) => c.filter(Boolean).join(' ')

export function Step7Objectives({ onNext, isSaving, initialData }) {
  const [form, setForm] = useState({
    objectives      : initialData?.objectives?.goals || [],
    priority_platforms: initialData?.objectives?.priority_platforms || [],
    target_clients  : initialData?.target_clients   || '',
    target_revenue  : initialData?.target_revenue   || '',
    growth_target   : '',
    main_objective  : '',
  })

  const toggleObjective = (id) => {
    setForm(f => ({
      ...f,
      objectives: f.objectives.includes(id)
        ? f.objectives.filter(o => o !== id)
        : [...f.objectives, id],
    }))
  }

  const togglePlatform = (p) => {
    setForm(f => ({
      ...f,
      priority_platforms: f.priority_platforms.includes(p)
        ? f.priority_platforms.filter(x => x !== p)
        : [...f.priority_platforms, p],
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onNext({
      objectives    : { goals: form.objectives, priority_platforms: form.priority_platforms },
      target_clients: form.target_clients,
      target_revenue: form.target_revenue,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Objectifs professionnels</h2>
        <p className="text-white/50 text-sm">Définissez vos objectifs pour les 12 prochains mois</p>
      </div>

      {/* Objectifs */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">Objectifs principaux</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {OBJECTIVE_TYPES.map(obj => (
            <button key={obj.id} type="button"
              onClick={() => toggleObjective(obj.id)}
              className={cn(
                'p-3 rounded-xl border text-sm text-left transition-all',
                form.objectives.includes(obj.id)
                  ? 'border-indigo-500 bg-indigo-500/20 text-white'
                  : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30'
              )}>
              {obj.label}
            </button>
          ))}
        </div>
      </div>

      {/* Plateformes prioritaires */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">Plateformes prioritaires</label>
        <div className="flex flex-wrap gap-2">
          {PRIORITY_PLATFORMS.map(p => (
            <button key={p} type="button"
              onClick={() => togglePlatform(p)}
              className={cn(
                'px-4 py-2 rounded-full border text-sm transition-all',
                form.priority_platforms.includes(p)
                  ? 'border-indigo-500 bg-indigo-500/20 text-white'
                  : 'border-white/15 bg-white/5 text-white/50 hover:border-white/30'
              )}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Cibles chiffrées */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Nombre de clients souhaité</label>
          <input type="number" min={0}
            value={form.target_clients}
            onChange={e => setForm(f => ({ ...f, target_clients: e.target.value }))}
            placeholder="Ex: 30"
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Chiffre d'affaires cible (€/an)</label>
          <input type="number" min={0}
            value={form.target_revenue}
            onChange={e => setForm(f => ({ ...f, target_revenue: e.target.value }))}
            placeholder="Ex: 200000"
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <button type="submit" disabled={isSaving}
        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-base disabled:opacity-50">
        {isSaving ? '⏳ Configuration en cours...' : '🚀 Lancer mon Dashboard Professionnel'}
      </button>
    </form>
  )
}