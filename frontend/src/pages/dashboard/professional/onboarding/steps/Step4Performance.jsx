// Step4Performance.jsx
import { useState } from 'react'

const METRICS = [
  { key: 'avg_roas',                   label: 'ROAS moyen',                  placeholder: '4.5',  suffix: 'x',  note: 'Déclaré par l\'agence' },
  { key: 'avg_engagement_rate',        label: "Taux d'engagement moyen",     placeholder: '3.2',  suffix: '%',  note: 'Déclaré' },
  { key: 'avg_follower_growth',        label: 'Croissance followers moy.',    placeholder: '15.0', suffix: '%',  note: 'Déclaré' },
  { key: 'total_campaigns_done',       label: 'Campagnes totales réalisées', placeholder: '250',  suffix: '',   note: '' },
  { key: 'monthly_ad_budget_managed',  label: 'Budget pub mensuel géré (€)', placeholder: '50000',suffix: '€',  note: '' },
  { key: 'client_retention_rate',      label: 'Taux de rétention clients',   placeholder: '85',   suffix: '%',  note: 'Déclaré' },
  { key: 'satisfied_clients_count',    label: 'Clients satisfaits',          placeholder: '45',   suffix: '',   note: '' },
  { key: 'successful_projects_count',  label: 'Projets réussis',             placeholder: '120',  suffix: '',   note: '' },
]

export function Step4Performance({ onNext, isSaving, initialData }) {
  const [form, setForm] = useState(
    Object.fromEntries(METRICS.map(m => [m.key, initialData?.[m.key] || '']))
  )

  return (
    <form onSubmit={e => { e.preventDefault(); onNext(form) }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Performance professionnelle</h2>
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <span>⚠️</span>
          <p className="text-amber-300 text-xs">
            Ces données sont <strong>déclarées par l'agence</strong>. Elles ne seront pas affichées comme "vérifiées" jusqu'à validation par Social Mind AI.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {METRICS.map(m => (
          <div key={m.key}>
            <label className="block text-sm font-medium text-white/70 mb-1">
              {m.label}
              {m.note && <span className="ml-2 text-xs text-amber-400">({m.note})</span>}
            </label>
            <div className="relative">
              <input
                type="number" min={0} step="0.01"
                value={form[m.key]}
                onChange={e => setForm(f => ({ ...f, [m.key]: e.target.value }))}
                placeholder={m.placeholder}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-10"
              />
              {m.suffix && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">{m.suffix}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <button type="submit" disabled={isSaving}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm disabled:opacity-50">
        {isSaving ? '⏳ Sauvegarde...' : 'Continuer →'}
      </button>
    </form>
  )
}