// frontend/src/components/calendar/WeekSummary.jsx

const COHERENCE_COLORS = {
  '🟢': 'text-green-600 bg-green-50 border-green-200',
  '🟡': 'text-amber-600 bg-amber-50 border-amber-200',
  '🟠': 'text-orange-600 bg-orange-50 border-orange-200',
  '🔴': 'text-red-600 bg-red-50 border-red-200',
}

export function WeekSummary({ calendar, stats, onApproveAll }) {
  if (!calendar) return null

  const pct            = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0
  const coherenceColor = COHERENCE_COLORS[calendar.coherence_level] || 'text-gray-600 bg-gray-50 border-gray-200'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">
            Semaine du {calendar.week_start} au {calendar.week_end}
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Niche : <span className="text-gray-600 font-medium">{calendar.niche}</span>
            {calendar.platforms?.length > 0 && (
              <span className="ml-2 text-gray-400">
                · {calendar.platforms.join(', ')}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {[
            { label: 'publications', value: stats.total,    color: 'text-indigo-600' },
            { label: 'approuvées',   value: stats.approved, color: 'text-green-600'  },
            { label: 'en file',      value: stats.queued,   color: 'text-blue-600'   },
            { label: 'repos',        value: stats.rest_days,color: 'text-gray-400'   },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}

          {/* Score cohérence MiniLM */}
          {calendar.coherence_score && (
            <div className={`px-4 py-2 rounded-xl text-center border ${coherenceColor}`}>
              <p className="text-xl font-bold">
                {Math.round(calendar.coherence_score * 100)}%
              </p>
              <p className="text-xs font-medium">cohérence {calendar.coherence_level}</p>
            </div>
          )}
        </div>
      </div>

      {/* Barre de progression */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Progression approbation</span>
          <span>{stats.approved}/{stats.total} ({pct}%)</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}