// frontend/src/pages/dashboard/standard/agents/HashtagPage.jsx
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { HashtagForm    } from '@/components/hashtags/HashtagForm'
import { HashtagResults } from '@/components/hashtags/HashtagResults'
import { TrendsTab      } from '@/components/hashtags/TrendsTab'
import { FavoritesTab   } from '@/components/hashtags/FavoritesTab'
import {
  useHashtagGenerate,
  useHashtagTrends,
  useFavorites,
  useSaveFavorite,
  useDeleteFavorite,
  useUseFavorite,
} from '@/hooks/useHashtags'

const TABS = [
  { id: 'hashtags',  label: '#️⃣ Hashtags'  },
  { id: 'trends',    label: '📈 Tendances'  },
  { id: 'favorites', label: '⭐ Favoris'    },
]

const cn = (...c) => c.filter(Boolean).join(' ')

export default function HashtagPage() {
  const navigate = useNavigate()

  const [activeTab,    setActiveTab]   = useState('hashtags')
  const [results,      setResults]     = useState(null)
  const [trends,       setTrends]      = useState(null)
  const [fromCache,    setFromCache]   = useState(false)
  const [lastSubject,  setLastSubject] = useState('')
  const [lastPlatform, setLastPlatform]= useState('instagram')

  const generateMutation = useHashtagGenerate()
  const trendsMutation   = useHashtagTrends()
  const saveMutation     = useSaveFavorite()
  const deleteMutation   = useDeleteFavorite()
  const useMutation2     = useUseFavorite()

  const { data: favorites = [], isLoading: loadingFavorites } = useFavorites()

  const handleGenerate = (formData) => {
    setLastSubject(formData.subject)
    setLastPlatform(formData.platform)
    generateMutation.mutate(formData, {
      onSuccess: (response) => {
        const data = response.data
        setResults(data)
        setFromCache(data.from_cache || false)
        setActiveTab('hashtags')
        setTrends(null)
      },
    })
  }

  const handleLoadTrends = () => {
    if (!lastSubject) return
    trendsMutation.mutate(
      { subject: lastSubject, platform: lastPlatform },
      {
        onSuccess: (response) => {
          setTrends(response.data)
          setActiveTab('trends')
        },
      }
    )
  }

  const handleSaveFavorite = (data) => {
    saveMutation.mutate(data)
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4]">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/agents')}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              #️⃣ Hashtags & Tendances
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                KeyBERT · Mistral 7B · Meta Graph API
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              15-30 hashtags catégorisés · Tendances réelles · Favoris
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Colonne gauche : Formulaire ── */}
          <div className="lg:col-span-1 space-y-4">
            <HashtagForm
              onSubmit={handleGenerate}
              onLoadTrends={handleLoadTrends}
              isLoading={generateMutation.isPending}
              isTrending={trendsMutation.isPending}
              hasResults={!!results}
            />

            {/* Historique rapide si résultats */}
            {results && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  🔑 Mots-clés détectés (KeyBERT)
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {(results.keywords_detected || []).map((kw, i) => (
                    <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs border border-indigo-100">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Colonne droite : Résultats avec onglets ── */}
          <div className="lg:col-span-2">
            {/* Onglets */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-100">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex-1 px-4 py-3.5 text-sm font-medium transition-colors',
                      activeTab === tab.id
                        ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    {tab.label}
                    {tab.id === 'favorites' && favorites.length > 0 && (
                      <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                        {favorites.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* ── Onglet Hashtags ── */}
                {activeTab === 'hashtags' && (
                  generateMutation.isPending ? (
                    <div className="text-center py-16">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-gray-500 text-sm">KeyBERT + Mistral 7B en cours...</p>
                      <p className="text-xs text-gray-400 mt-1">Environ 30-60 secondes</p>
                    </div>
                  ) : results ? (
                    <HashtagResults
                      results={results}
                      fromCache={fromCache}
                      subject={lastSubject}
                      platform={lastPlatform}
                      onSaveFavorite={handleSaveFavorite}
                      isSaving={saveMutation.isPending}
                    />
                  ) : (
                    <div className="text-center py-16 text-gray-400">
                      <div className="text-5xl mb-4">#️⃣</div>
                      <p className="text-lg font-medium text-gray-600">Prêt à générer des hashtags</p>
                      <p className="text-sm">Entrez votre sujet et cliquez sur "Générer les Hashtags"</p>
                    </div>
                  )
                )}

                {/* ── Onglet Tendances ── */}
                {activeTab === 'trends' && (
                  <TrendsTab
                    trends={trends}
                    isLoading={trendsMutation.isPending}
                    onLoadTrends={handleLoadTrends}
                    subject={lastSubject}
                  />
                )}

                {/* ── Onglet Favoris ── */}
                {activeTab === 'favorites' && (
                  loadingFavorites ? (
                    <div className="flex justify-center py-12">
                      <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                  ) : (
                    <FavoritesTab
                      favorites={favorites}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      onUse={(id) => useMutation2.mutate(id)}
                      isDeleting={deleteMutation.isPending}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}