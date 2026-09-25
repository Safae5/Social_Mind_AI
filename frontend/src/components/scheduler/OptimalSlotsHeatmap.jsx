// frontend/src/components/scheduler/OptimalSlotsHeatmap.jsx
import { useMemo } from 'react'
import { RefreshCw } from 'lucide-react'

const DAYS_FR  = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const HOURS    = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]

export default function OptimalSlotsHeatmap({ slots, heatmap, onAnalyze, accounts, isAnalyzing }) {
  // Construit la grille heatmap 7×17
  const grid = useMemo(() => {
    const map = {}
    heatmap.forEach(cell => {
      map[`${cell.day}-${cell.hour}`] = cell.engagement
    })
    return map
  }, [heatmap])

  const maxEngagement = useMemo(() => {
    return Math.max(...Object.values(grid), 1)
  }, [grid])

  const getColor = (engagement) => {
    if (!engagement) return 'bg-gray-50 border-gray-100'
    const ratio = engagement / maxEngagement
    if (ratio > 0.8) return 'bg-indigo-600 border-indigo-600'
    if (ratio > 0.6) return 'bg-indigo-400 border-indigo-400'
    if (ratio > 0.4) return 'bg-indigo-200 border-indigo-200'
    if (ratio > 0.2) return 'bg-indigo-100 border-indigo-100'
    return 'bg-gray-50 border-gray-100'
  }

  const isOptimalSlot = (day, hour) => {
    return slots.some(s => s.day_of_week === day && s.hour === hour)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            ⚡ Créneaux optimaux détectés
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Basé sur l'analyse de {slots[0]?.posts_analyzed ?? 0} publications via Prophet + KMeans.
            Source : {slots[0]?.data_source ?? 'N/A'}
          </p>
        </div>
        <div className="flex gap-2">
          {accounts.map(acc => (
            <button
              key={acc.id}
              onClick={() => onAnalyze(acc.id)}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? 'Analyse...' : `Réanalyser @${acc.username}`}
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      {heatmap.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="w-12 text-left text-gray-400 font-normal pb-2">Heure</th>
                {DAYS_FR.map(d => (
                  <th key={d} className="text-center text-gray-500 font-medium pb-2 w-12">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(hour => (
                <tr key={hour}>
                  <td className="text-gray-400 pr-2 py-0.5">{hour}h</td>
                  {[0,1,2,3,4,5,6].map(day => {
                    const engagement = grid[`${day}-${hour}`] || 0
                    const isOptimal  = isOptimalSlot(day, hour)
                    return (
                      <td key={day} className="p-0.5">
                        <div
                          className={`
                            w-10 h-6 rounded border text-center leading-6 relative
                            ${getColor(engagement)}
                            ${isOptimal ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}
                          `}
                          title={engagement > 0 ? `Score: ${engagement.toFixed(1)}` : ''}
                        >
                          {isOptimal && (
                            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[10px]">
                              ★
                            </span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-indigo-600 border border-indigo-600" />
              <span>Engagement élevé</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-indigo-100 border border-indigo-100" />
              <span>Engagement moyen</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-gray-50 border border-gray-100" />
              <span>Peu de données</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded border-2 border-indigo-500 bg-indigo-100" />
              <span>★ Créneau optimal sélectionné</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-6">
          Lance l'analyse pour voir la heatmap d'engagement.
        </p>
      )}

      {/* Top créneaux */}
      {slots.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">🏆 Top créneaux recommandés</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {slots.slice(0, 8).map(slot => (
              <div key={slot.id}
                   className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                <span className="text-xs font-bold text-indigo-800 bg-indigo-200 px-1.5 py-0.5 rounded">
                  #{slot.rank}
                </span>
                <div>
                  <p className="text-xs font-semibold text-gray-900">{slot.day_name}</p>
                  <p className="text-xs text-indigo-600">{slot.time}</p>
                </div>
                <span className="ml-auto text-xs text-gray-400">{slot.composite_score.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}