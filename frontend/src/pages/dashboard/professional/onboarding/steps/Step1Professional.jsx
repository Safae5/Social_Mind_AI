// Step1Professional.jsx
import { useState } from 'react'

const ACTIVITY_TYPES = [
  { value: 'smma_agency',           label: '🏢 SMMA Agency'            },
  { value: 'freelance_marketer',    label: '💼 Freelance Marketer'     },
  { value: 'marketing_consultant',  label: '🎯 Marketing Consultant'   },
  { value: 'community_manager',     label: '💬 Community Manager'      },
  { value: 'marketing_team',        label: '👥 Marketing Team'         },
  { value: 'other',                 label: '🔧 Other'                  },
]

const cn = (...c) => c.filter(Boolean).join(' ')

export function Step1Professional({ onNext, isSaving, initialData }) {
  const [form, setForm] = useState({
    agency_name              : initialData?.agency_name               || '',
    professional_phone       : initialData?.professional_phone        || '',
    website                  : initialData?.website                   || '',
    founded_year             : initialData?.founded_year              || '',
    activity_type            : initialData?.activity_type             || '',
    team_size                : initialData?.team_size                 || '',
    current_clients_count    : initialData?.current_clients_count     || '',
    avg_simultaneous_clients : initialData?.avg_simultaneous_clients  || '',
    active_projects          : initialData?.active_projects           || '',
    years_experience         : initialData?.years_experience          || '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onNext(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Informations professionnelles</h2>
        <p className="text-white/50 text-sm">Décrivez votre agence ou activité de marketing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: "Nom de l'agence / Entreprise", key: 'agency_name', placeholder: 'Ex: Digital Boost Agency' },
          { label: 'Téléphone professionnel', key: 'professional_phone', placeholder: '+33 6 12 34 56 78' },
          { label: 'Site web', key: 'website', placeholder: 'https://votre-agence.com' },
          { label: 'Année de création', key: 'founded_year', placeholder: '2020', type: 'number' },
        ].map(({ label, key, placeholder, type = 'text' }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-white/70 mb-1">{label}</label>
            <input
              type={type}
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        ))}
      </div>

      {/* Type d'activité */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">Type d'activité</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {ACTIVITY_TYPES.map(type => (
            <button
              key={type.value}
              type="button"
              onClick={() => setForm(f => ({ ...f, activity_type: type.value }))}
              className={cn(
                'p-3 rounded-xl border text-sm text-left transition-all',
                form.activity_type === type.value
                  ? 'border-indigo-500 bg-indigo-500/20 text-white'
                  : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30'
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Métriques agence */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Taille de l'équipe",          key: 'team_size'                },
          { label: 'Clients actuels',              key: 'current_clients_count'    },
          { label: 'Clients simultanés (moy.)',   key: 'avg_simultaneous_clients' },
          { label: 'Projets actifs',               key: 'active_projects'          },
          { label: "Années d'expérience",          key: 'years_experience'         },
        ].map(({ label, key }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-white/50 mb-1">{label}</label>
            <input
              type="number"
              min={0}
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors"
      >
        {isSaving ? '⏳ Sauvegarde...' : 'Continuer →'}
      </button>
    </form>
  )
}