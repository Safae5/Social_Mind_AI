// Step2Expertise.jsx
import { useState } from 'react'

const EXPERTISE_DOMAINS = [
  'Social Media Management', 'Content Creation', 'Community Management',
  'Paid Advertising', 'Meta Ads', 'Google Ads', 'SEO',
  'Influencer Marketing', 'Email Marketing', 'Branding',
  'Copywriting', 'Analytics', 'Marketing Strategy',
  'Lead Generation', 'E-commerce Marketing',
]

const PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'YouTube', 'Twitter/X', 'Pinterest', 'Snapchat', 'Google']
const TOOLS     = ['Hootsuite', 'Buffer', 'Sprout Social', 'Canva', 'Adobe Creative Suite', 'Meta Business Suite', 'Google Analytics', 'HubSpot', 'Mailchimp', 'Notion', 'Asana']

const cn = (...c) => c.filter(Boolean).join(' ')

export function Step2Expertise({ onNext, isSaving, initialData }) {
  const [selected, setSelected] = useState({
    expertise_domains     : initialData?.expertise_domains     || [],
    platforms_mastered    : initialData?.platforms_mastered    || [],
    tools_used            : initialData?.tools_used            || [],
    avg_monthly_ad_budget : initialData?.avg_monthly_ad_budget || '',
    campaigns_managed_count: initialData?.campaigns_managed_count || '',
  })

  const toggle = (field, value) => {
    setSelected(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value],
    }))
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onNext(selected) }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Expertise marketing</h2>
        <p className="text-white/50 text-sm">Sélectionnez vos domaines de compétence</p>
      </div>

      {/* Domaines d'expertise */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">Domaines d'expertise</label>
        <div className="flex flex-wrap gap-2">
          {EXPERTISE_DOMAINS.map(d => (
            <button
              key={d} type="button"
              onClick={() => toggle('expertise_domains', d)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm border transition-all',
                selected.expertise_domains.includes(d)
                  ? 'border-indigo-500 bg-indigo-500/20 text-white'
                  : 'border-white/15 bg-white/5 text-white/50 hover:border-white/30'
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Plateformes */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">Plateformes maîtrisées</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <button
              key={p} type="button"
              onClick={() => toggle('platforms_mastered', p)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm border transition-all',
                selected.platforms_mastered.includes(p)
                  ? 'border-blue-500 bg-blue-500/20 text-white'
                  : 'border-white/15 bg-white/5 text-white/50 hover:border-white/30'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Outils */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">Outils marketing utilisés</label>
        <div className="flex flex-wrap gap-2">
          {TOOLS.map(t => (
            <button
              key={t} type="button"
              onClick={() => toggle('tools_used', t)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm border transition-all',
                selected.tools_used.includes(t)
                  ? 'border-purple-500 bg-purple-500/20 text-white'
                  : 'border-white/15 bg-white/5 text-white/50 hover:border-white/30'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Chiffres */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1">Budget pub mensuel moyen (€)</label>
          <input
            type="number" min={0}
            value={selected.avg_monthly_ad_budget}
            onChange={e => setSelected(s => ({ ...s, avg_monthly_ad_budget: e.target.value }))}
            placeholder="Ex: 5000"
            className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1">Campagnes gérées (total)</label>
          <input
            type="number" min={0}
            value={selected.campaigns_managed_count}
            onChange={e => setSelected(s => ({ ...s, campaigns_managed_count: e.target.value }))}
            placeholder="Ex: 150"
            className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <button type="submit" disabled={isSaving}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm disabled:opacity-50">
        {isSaving ? '⏳ Sauvegarde...' : 'Continuer →'}
      </button>
    </form>
  )
}