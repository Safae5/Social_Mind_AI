// Step5Services.jsx
import { useState } from 'react'

const SERVICES_LIST = [
  { id: 'social_media_management', label: '📱 Social Media Management' },
  { id: 'content_creation',        label: '✨ Content Creation'         },
  { id: 'paid_ads',                label: '💰 Paid Ads'                 },
  { id: 'meta_ads',                label: '🎯 Meta Ads'                 },
  { id: 'google_ads',              label: '🔍 Google Ads'               },
  { id: 'community_management',    label: '💬 Community Management'     },
  { id: 'influencer_marketing',    label: '⭐ Influencer Marketing'      },
  { id: 'seo',                     label: '📊 SEO'                      },
  { id: 'branding',                label: '🎨 Branding'                 },
  { id: 'marketing_strategy',      label: '🗺️ Marketing Strategy'       },
  { id: 'analytics',               label: '📈 Analytics'                },
  { id: 'lead_generation',         label: '🎣 Lead Generation'          },
]

const BILLING_MODELS = ['monthly_retainer', 'project_based', 'hourly', 'performance_based']
const cn = (...c) => c.filter(Boolean).join(' ')

export function Step5Services({ onNext, isSaving, initialData }) {
  const [selectedServices, setSelectedServices] = useState(
    initialData?.services?.map(s => s.id) || []
  )
  const [serviceDetails, setServiceDetails] = useState(
    Object.fromEntries((initialData?.services || []).map(s => [s.id, s]))
  )

  const toggleService = (id) => {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
    if (!serviceDetails[id]) {
      setServiceDetails(prev => ({
        ...prev,
        [id]: { id, expertise_level: 'intermediate', billing_model: 'monthly_retainer', min_price: '', max_price: '' }
      }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const services = selectedServices.map(id => ({
      ...serviceDetails[id],
      id,
      label: SERVICES_LIST.find(s => s.id === id)?.label || id,
    }))
    onNext({ services })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Services proposés</h2>
        <p className="text-white/50 text-sm">Sélectionnez et détaillez vos services</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {SERVICES_LIST.map(s => (
          <button
            key={s.id} type="button"
            onClick={() => toggleService(s.id)}
            className={cn(
              'p-3 rounded-xl border text-sm text-left transition-all',
              selectedServices.includes(s.id)
                ? 'border-indigo-500 bg-indigo-500/20 text-white'
                : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Détails des services sélectionnés */}
      {selectedServices.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white/70">Tarification par service</h3>
          {selectedServices.map(id => {
            const service = SERVICES_LIST.find(s => s.id === id)
            return (
              <div key={id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-sm font-medium text-white mb-3">{service?.label}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Modèle facturation</label>
                    <select
                      value={serviceDetails[id]?.billing_model || 'monthly_retainer'}
                      onChange={e => setServiceDetails(prev => ({
                        ...prev,
                        [id]: { ...prev[id], billing_model: e.target.value }
                      }))}
                      className="w-full bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                    >
                      {BILLING_MODELS.map(m => (
                        <option key={m} value={m} className="bg-slate-800">{m.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Prix min (€)</label>
                    <input type="number" min={0}
                      value={serviceDetails[id]?.min_price || ''}
                      onChange={e => setServiceDetails(prev => ({
                        ...prev, [id]: { ...prev[id], min_price: e.target.value }
                      }))}
                      placeholder="500"
                      className="w-full bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Prix max (€)</label>
                    <input type="number" min={0}
                      value={serviceDetails[id]?.max_price || ''}
                      onChange={e => setServiceDetails(prev => ({
                        ...prev, [id]: { ...prev[id], max_price: e.target.value }
                      }))}
                      placeholder="3000"
                      className="w-full bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Niveau expertise</label>
                    <select
                      value={serviceDetails[id]?.expertise_level || 'intermediate'}
                      onChange={e => setServiceDetails(prev => ({
                        ...prev, [id]: { ...prev[id], expertise_level: e.target.value }
                      }))}
                      className="w-full bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                    >
                      {['beginner', 'intermediate', 'advanced', 'expert'].map(l => (
                        <option key={l} value={l} className="bg-slate-800">{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <button type="submit" disabled={isSaving}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm disabled:opacity-50">
        {isSaving ? '⏳ Sauvegarde...' : 'Continuer →'}
      </button>
    </form>
  )
}