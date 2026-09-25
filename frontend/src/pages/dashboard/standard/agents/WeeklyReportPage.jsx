// frontend/src/pages/dashboard/standard/agents/WeeklyReportPage.jsx
import { useState, useEffect } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { ReportCard  } from '@/components/report/ReportCard'
import { MetricCard  } from '@/components/report/MetricCard'
import { TrendChart  } from '@/components/report/TrendChart'
import { weeklyReportApi } from '@/api/weeklyReportApi'

export default function WeeklyReportPage() {
  const navigate = useNavigate()

  const [latestReport, setLatest]     = useState(null)
  const [history,      setHistory]    = useState([])
  const [selected,     setSelected]   = useState(null)
  const [isLoading,    setLoading]    = useState(true)
  const [isGenerating, setGenerating] = useState(false)
  const [error,        setError]      = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [latestRes, historyRes] = await Promise.all([
        weeklyReportApi.getLatest(),
        weeklyReportApi.getAll(),
      ])
      const latest  = latestRes.data.data?.report || null
      const reports = historyRes.data.data?.reports || []
      setLatest(latest)
      setHistory(reports)
      setSelected(latest)
    } catch {
      setError('Erreur de chargement du rapport.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    try {
      await weeklyReportApi.generateNow()
      toast.success('✅ Génération lancée ! Revenez dans quelques minutes.')
      setTimeout(loadData, 5000) // Recharge dans 5s
    } catch {
      setError('Erreur lors de la génération.')
      toast.error('Erreur lors de la génération.')
    } finally {
      setGenerating(false)
    }
  }

  const displayReport = selected || latestReport

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Chargement de votre rapport...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4]">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              📊 Mon Résumé de la Semaine
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                Mistral 7B · Meta Graph API · Chart.js
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Performances expliquées en langage simple — sans jargon
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Génération...' : '🔄 Générer maintenant'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {/* Erreur */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            ❌ {error}
          </div>
        )}

        {/* État vide */}
        {!displayReport ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-xl font-medium text-gray-700 mb-2">Aucun rapport disponible</p>
            <p className="text-sm text-gray-400 mb-6">
              Votre premier rapport sera généré lundi prochain à 8h.<br />
              Connectez un compte social pour commencer.
            </p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {isGenerating ? '⏳ Génération...' : '🚀 Générer maintenant'}
            </button>
          </div>
        ) : (
          <>
            {/* Rapport principal */}
            <ReportCard report={displayReport} />

            {/* 3 métriques clés */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                icon="👁️"
                label="Publications vues"
                color="indigo"
                value={(displayReport.metrics?.reach || 0).toLocaleString('fr-FR')}
                subtext="fois cette semaine"
              />
              <MetricCard
                icon="❤️"
                label="Interactions"
                color="red"
                value={(displayReport.metrics?.engagement || 0).toLocaleString('fr-FR')}
                subtext="j'aime, commentaires, partages"
              />
              <MetricCard
                icon="👥"
                label="Abonnés"
                color="green"
                value={(displayReport.metrics?.followers_now || 0).toLocaleString('fr-FR')}
                subtext={`+${displayReport.metrics?.followers_gained || 0} cette semaine`}
              />
            </div>

            {/* Graphique tendance 4 semaines */}
            {displayReport.trend_data && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-1">
                  📈 Tendance sur 4 semaines
                </h2>
                <p className="text-sm text-gray-400 mb-5">
                  Évolution de vos vues et interactions au fil des semaines
                </p>
                <TrendChart trendData={displayReport.trend_data} />
              </div>
            )}

            {/* Meilleure publication */}
            {displayReport.best_post && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-amber-800 mb-3">🏆 Détails — Meilleure publication</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Vues',         value: (displayReport.best_post.reach  || 0).toLocaleString('fr-FR') },
                    { label: "J'aime",        value: (displayReport.best_post.likes  || 0).toLocaleString('fr-FR') },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-amber-700">{value}</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>
                {displayReport.best_post.caption && (
                  <p className="text-xs text-gray-500 mt-3 italic">
                    "{displayReport.best_post.caption}"
                  </p>
                )}
              </div>
            )}

            {/* Historique des rapports précédents */}
            {history.length > 1 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  🗂️ Rapports précédents
                </h2>
                <div className="space-y-2">
                  {history.map(report => (
                    <button
                      key={report.id}
                      onClick={() => setSelected(report)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left ${
                        selected?.id === report.id
                          ? 'bg-indigo-50 border border-indigo-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{report.emoji}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{report.titre}</p>
                          <p className="text-xs text-gray-400">
                            {report.week_start} – {report.week_end}
                          </p>
                        </div>
                        {!report.is_read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {'⭐'.repeat(report.score || 3)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}