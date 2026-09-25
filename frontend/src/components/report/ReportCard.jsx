// frontend/src/components/report/ReportCard.jsx

export function ReportCard({ report }) {
  if (!report) return null
  const scoreStars = '⭐'.repeat(report.score || 3) + '☆'.repeat(5 - (report.score || 3))

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 text-white">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-indigo-300 text-sm mb-1">
            {report.week_start} — {report.week_end}
          </p>
          <h2 className="text-xl font-bold">
            {report.emoji} {report.titre}
          </h2>
          <p className="text-indigo-200 text-lg mt-1">{scoreStars}</p>
        </div>
        <div className="text-5xl">{report.emoji}</div>
      </div>

      {/* 4 sections colorées */}
      <div className="space-y-4">

        {/* Bilan */}
        <div className="bg-white/10 rounded-xl p-4">
          <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wide mb-2">
            📋 Bilan de la semaine
          </p>
          <p className="text-white leading-relaxed">{report.bilan}</p>
        </div>

        {/* Meilleure publication */}
        <div className="bg-amber-500/20 rounded-xl p-4 border border-amber-400/30">
          <p className="text-amber-300 text-xs font-semibold uppercase tracking-wide mb-2">
            🏆 Votre meilleure publication
          </p>
          <p className="text-white leading-relaxed">{report.top_publication}</p>
        </div>

        {/* Audience */}
        <div className="bg-green-500/20 rounded-xl p-4 border border-green-400/30">
          <p className="text-green-300 text-xs font-semibold uppercase tracking-wide mb-2">
            👥 Votre audience
          </p>
          <p className="text-white leading-relaxed">{report.audience}</p>
        </div>

        {/* Recommandation */}
        <div className="bg-blue-500/20 rounded-xl p-4 border border-blue-400/30">
          <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide mb-2">
            💡 Mon conseil pour cette semaine
          </p>
          <p className="text-white leading-relaxed font-medium">{report.recommandation}</p>
        </div>
      </div>
    </div>
  )
}