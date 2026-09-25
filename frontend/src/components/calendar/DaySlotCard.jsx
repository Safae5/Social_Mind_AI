// frontend/src/components/calendar/DaySlotCard.jsx
import { useState } from 'react'

export const POST_TYPE_CONFIG = {
  reel    : { emoji: '🎵', label: 'Reel',      color: 'bg-purple-100 text-purple-700' },
  carousel: { emoji: '🎠', label: 'Carrousel', color: 'bg-blue-100 text-blue-700'    },
  static  : { emoji: '📸', label: 'Statique',  color: 'bg-green-100 text-green-700'  },
  story   : { emoji: '⏱️', label: 'Story',     color: 'bg-amber-100 text-amber-700'  },
  video   : { emoji: '🎬', label: 'Vidéo',     color: 'bg-red-100 text-red-700'      },
  article : { emoji: '📝', label: 'Article',   color: 'bg-indigo-100 text-indigo-700'},
}

export const PLATFORM_EMOJI = {
  instagram: '📸', tiktok: '🎵', facebook: '👥', linkedin: '💼', twitter: '🐦',
}

const STATUS_CONFIG = {
  suggested: { label: '💡 Suggéré',  bg: 'border-gray-200 bg-white'               },
  approved : { label: '✅ Approuvé', bg: 'border-green-300 bg-green-50'           },
  modified : { label: '✏️ Modifié',  bg: 'border-blue-300 bg-blue-50'             },
  queued   : { label: '📅 En file',  bg: 'border-indigo-300 bg-indigo-50'         },
  published: { label: '✅ Publié',   bg: 'border-green-400 bg-green-100'          },
  skipped  : { label: '⏭️ Ignoré',  bg: 'border-gray-200 bg-gray-100 opacity-50' },
}

export function DaySlotCard({ slot, onApprove, onSkip, onQueue, onRegenerate, onEdit }) {
  const [loading, setLoading] = useState('')

  const withLoading = (key, fn) => async () => {
    setLoading(key)
    try { await fn() }
    finally { setLoading('') }
  }

  const statusCfg = STATUS_CONFIG[slot.status] || STATUS_CONFIG.suggested
  const postCfg   = slot.post_type ? POST_TYPE_CONFIG[slot.post_type] : null

  // ── Jour de repos ─────────────────────────────────────────
  if (slot.is_rest_day) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-3 min-h-[280px] flex flex-col items-center justify-center text-center">
        <div className="text-2xl mb-2">😴</div>
        <p className="text-xs font-semibold text-gray-400">{slot.day_name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{slot.date_fr}</p>
        <p className="text-xs text-gray-300 mt-3">Jour de repos</p>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border-2 ${statusCfg.bg} p-3 min-h-[280px] flex flex-col transition-all hover:shadow-md`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs font-bold text-gray-700">{slot.day_name}</p>
          <p className="text-xs text-gray-400">{slot.date_fr}</p>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm">{PLATFORM_EMOJI[slot.platform] || '📱'}</span>
          <span className="text-xs text-gray-400">{slot.best_time}</span>
        </div>
      </div>

      {/* Badges */}
      <div className="flex gap-1 mb-2 flex-wrap">
        {postCfg && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${postCfg.color}`}>
            {postCfg.emoji} {postCfg.label}
          </span>
        )}
        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
          {statusCfg.label}
        </span>
        {slot.is_modified && (
          <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full">✏️</span>
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-800 leading-tight mb-1 line-clamp-2">
          {slot.subject}
        </p>
        {slot.angle && (
          <p className="text-xs text-indigo-600 mb-1">↳ {slot.angle}</p>
        )}
        {slot.caption_idea && (
          <p className="text-xs text-gray-500 italic line-clamp-2">{slot.caption_idea}</p>
        )}
      </div>

      {/* Hashtags */}
      {slot.hashtags && slot.hashtags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {slot.hashtags.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
              {tag}
            </span>
          ))}
          {slot.hashtags.length > 3 && (
            <span className="text-xs text-gray-400">+{slot.hashtags.length - 3}</span>
          )}
        </div>
      )}

      {/* Justification IA */}
      {slot.why && (
        <p className="text-xs text-gray-400 mt-2 italic leading-tight line-clamp-2">
          🤖 {slot.why}
        </p>
      )}

      {/* Actions */}
      {!['queued', 'published', 'skipped'].includes(slot.status) && (
        <div className="mt-3 space-y-1.5">
          <div className="flex gap-1.5">
            <button
              onClick={withLoading('approve', onApprove)}
              disabled={!!loading}
              className="flex-1 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading === 'approve' ? '⏳' : '✅ Approuver'}
            </button>
            <button
              onClick={onEdit}
              disabled={!!loading}
              className="py-1.5 px-2.5 border border-gray-200 text-gray-500 rounded-lg text-xs hover:bg-gray-50"
            >
              ✏️
            </button>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={withLoading('regen', onRegenerate)}
              disabled={!!loading}
              className="flex-1 py-1.5 border border-indigo-200 text-indigo-600 rounded-lg text-xs hover:bg-indigo-50 disabled:opacity-50"
            >
              {loading === 'regen' ? '⏳' : '🔄 Régénérer'}
            </button>
            <button
              onClick={withLoading('skip', onSkip)}
              disabled={!!loading}
              className="py-1.5 px-2.5 border border-gray-200 text-gray-400 rounded-lg text-xs hover:bg-gray-50"
            >
              ⏭️
            </button>
          </div>
          {['approved', 'modified'].includes(slot.status) && (
            <button
              onClick={withLoading('queue', onQueue)}
              disabled={!!loading}
              className="w-full py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading === 'queue' ? '⏳' : '📅 → Planificateur'}
            </button>
          )}
        </div>
      )}

      {/* Badge file d'attente */}
      {slot.status === 'queued' && (
        <div className="mt-3 p-2 bg-indigo-50 rounded-lg text-center">
          <p className="text-xs text-indigo-700 font-medium">📅 En file d'attente</p>
        </div>
      )}
    </div>
  )
}