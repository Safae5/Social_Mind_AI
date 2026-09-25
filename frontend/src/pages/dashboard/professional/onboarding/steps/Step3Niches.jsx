// Step3Niches.jsx
import { useState } from 'react'

const NICHES = [
  { value: 'cosmetics_beauty', label: '💄 Cosmetics & Beauty'  },
  { value: 'fashion',          label: '👗 Fashion'              },
  { value: 'fitness_sports',   label: '💪 Fitness & Sports'    },
  { value: 'restaurants',      label: '🍽️ Restaurants'         },
  { value: 'real_estate',      label: '🏠 Real Estate'          },
  { value: 'technology',       label: '💻 Technology'           },
  { value: 'saas',             label: '⚙️ SaaS'                 },
  { value: 'ecommerce',        label: '🛒 E-commerce'           },
  { value: 'healthcare',       label: '🏥 Healthcare'           },
  { value: 'education',        label: '📚 Education'            },
  { value: 'finance',          label: '💰 Finance'              },
  { value: 'travel',           label: '✈️ Travel'               },
  { value: 'automotive',       label: '🚗 Automotive'           },
  { value: 'food',             label: '🍕 Food'                 },
  { value: 'personal_brands',  label: '⭐ Personal Brands'      },
  { value: 'other',            label: '🔧 Other'                },
]

const cn = (...c) => c.filter(Boolean).join(' ')

export function Step3Niches({ onNext, isSaving, initialData }) {
  const [selectedNiches, setSelectedNiches] = useState(initialData?.niches || [])
  const [nicheDetails,   setNicheDetails]   = useState(initialData?.niche_details || {})

  const toggleNiche = (value) => {
    setSelectedNiches(prev =>
      prev.includes(value) ? prev.filter(n => n !== value) : [...prev, value]
    )
  }

  const updateNicheDetail = (niche, field, value) => {
    setNicheDetails(prev => ({
      ...prev,
      [niche]: { ...prev[niche], [field]: value },
    }))
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onNext({ niches: selectedNiches, niche_details: nicheDetails }) }}
      className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Niches spécialisées</h2>
        <p className="text-white/50 text-sm">Sélectionnez les niches dans lesquelles vous avez des résultats mesurables</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {NICHES.map(niche => (
          <button
            key={niche.value} type="button"
            onClick={() => toggleNiche(niche.value)}
            className={cn(
              'p-3 rounded-xl border text-sm text-left transition-all',
              selectedNiches.includes(niche.value)
                ? 'border-indigo-500 bg-indigo-500/20 text-white'
                : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30'
            )}
          >
            {niche.label}
          </button>
        ))}
      </div>

      {/* Détails par niche sélectionnée */}
      {selectedNiches.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white/70">
            Détails par niche (optionnel — renforce votre profil Marketplace)
          </h3>
          {selectedNiches.map(nicheVal => {
            const nicheInfo = NICHES.find(n => n.value === nicheVal)
            return (
              <div key={nicheVal} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-sm font-medium text-white mb-3">{nicheInfo?.label}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Clients', field: 'clients_count', placeholder: '10' },
                    { label: "Années d'expérience", field: 'years_exp', placeholder: '3' },
                    { label: 'Campagnes', field: 'campaigns', placeholder: '50' },
                    { label: 'Résultats clés', field: 'key_results', placeholder: 'ROAS 5x, +200% followers' },
                  ].map(({ label, field, placeholder }) => (
                    <div key={field}>
                      <label className="block text-xs text-white/40 mb-1">{label}</label>
                      <input
                        type="text" placeholder={placeholder}
                        value={nicheDetails[nicheVal]?.[field] || ''}
                        onChange={e => updateNicheDetail(nicheVal, field, e.target.value)}
                        className="w-full bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <button type="submit" disabled={isSaving || selectedNiches.length === 0}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm disabled:opacity-50">
        {isSaving ? '⏳ Sauvegarde...' : `Continuer avec ${selectedNiches.length} niche(s) →`}
      </button>
    </form>
  )
}