// frontend/src/components/hashtags/TrendsTab.jsx

const DIFF_CONFIG = {
  'Facile' : { color: 'text-green-700',  bg: 'bg-green-100'  },
  'Moyen'  : { color: 'text-amber-700',  bg: 'bg-amber-100'  },
  'Avancé' : { color: 'text-purple-700', bg: 'bg-purple-100' },
}

const SOURCE_LABELS = {
  meta_graph_api: { label: 'Meta Graph API',  color: 'bg-blue-100 text-blue-700'    },
  google_trends : { label: 'Google Trends',   color: 'bg-green-100 text-green-700'  },
  mistral_ai    : { label: 'Mistral 7B IA',   color: 'bg-purple-100 text-purple-700'},
}

export function TrendsTab({ trends, isLoading, onLoadTrends, subject }) {
  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Analyse des tendances (Meta + Google Trends)...</p>
      </div>
    )
  }

  if (!trends) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-5xl mb-4">📈</div>
        <p className="text-lg font-medium text-gray-600">Tendances non chargées</p>
        <p className="text-sm mb-4">Générez des hashtags d'abord, puis chargez les tendances.</p>
        {subject && (
          <button
            onClick={onLoadTrends}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            📈 Charger les tendances pour "{subject}"
          </button>
        )}
      </div>
    )
  }

  const {
    tendances      = [],
    angles_contenu = [],
    sources_used   = {},
    generated_at,
  } = trends

  return (
    <div className="space-y-8">

      {/* Sources utilisées */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-500 font-medium">Sources :</span>
        {Object.entries(sources_used).map(([key, used]) =>
          used && SOURCE_LABELS[key] ? (
            <span key={key} className={`text-xs px-2.5 py-1 rounded-full font-medium ${SOURCE_LABELS[key].color}`}>
              ✅ {SOURCE_LABELS[key].label}
            </span>
          ) : null
        )}
        {generated_at && (
          <span className="text-xs text-gray-400 ml-auto">
            Généré le {new Date(generated_at).toLocaleString('fr-FR')}
          </span>
        )}
      </div>

      {/* Tendances */}
      {tendances.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">🔥 Tendances du Moment</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tendances.map((trend, idx) => (
              <div key={idx} className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                  <div className="flex items-center gap-1">
                    {'🔥'.repeat(Math.min(5, Math.floor((trend.score_viral || 5) / 2)))}
                    <span className="text-xs text-gray-400 ml-1">{trend.score_viral || '?'}/10</span>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-gray-800 mb-2 leading-tight">{trend.titre}</h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-3">{trend.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {trend.format && (
                    <span className="px-2 py-1 bg-white/80 text-gray-600 rounded-lg text-xs border border-gray-100">
                      {trend.format}
                    </span>
                  )}
                  {(trend.hashtags || []).slice(0, 2).map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs">
                      {tag}
                    </span>
                  ))}
                  {trend.source && SOURCE_LABELS[trend.source] && (
                    <span className={`px-2 py-1 rounded-lg text-xs ${SOURCE_LABELS[trend.source].color}`}>
                      {SOURCE_LABELS[trend.source].label}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Angles de contenu */}
      {angles_contenu.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">💡 Angles de Contenu Performants</h2>
          <div className="space-y-3">
            {angles_contenu.map((angle, idx) => {
              const diff = DIFF_CONFIG[angle.difficulte] || DIFF_CONFIG['Facile']
              return (
                <div key={idx} className="flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:border-indigo-200 transition-colors">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-bold text-gray-800">{angle.angle}</h3>
                      {angle.difficulte && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diff.color} ${diff.bg}`}>
                          {angle.difficulte}
                        </span>
                      )}
                      {angle.format && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                          {angle.format}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{angle.description}</p>
                    {angle.exemple && (
                      <p className="text-xs text-indigo-600 italic bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                        💬 Ex : "{angle.exemple}"
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}