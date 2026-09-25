// frontend/src/components/inbox/MessageCard.jsx
import { Camera, Globe, Music } from 'lucide-react'

const SENTIMENT_CONFIG = {
  positive: { emoji: '🟢', label: 'Positif',  bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700'  },
  question: { emoji: '🔵', label: 'Question', bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700'   },
  negative: { emoji: '🔴', label: 'Négatif',  bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700'    },
  neutral : { emoji: '⚪', label: 'Neutre',   bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-700'   },
  spam    : { emoji: '⚫', label: 'Spam',     bg: 'bg-gray-100',  border: 'border-gray-300',   text: 'text-gray-500'   },
}

const STATUS_CONFIG = {
  pending_approval: { label: '⏳ À approuver',   bg: 'bg-amber-100 text-amber-700'  },
  flagged         : { label: '🚩 Signalé',        bg: 'bg-red-100 text-red-700'      },
  auto_replied    : { label: '🤖 Auto-répondu',   bg: 'bg-indigo-100 text-indigo-700'},
  published       : { label: '✅ Publié',          bg: 'bg-green-100 text-green-700'  },
  hidden          : { label: '⚫ Masqué',          bg: 'bg-gray-100 text-gray-600'   },
  rejected        : { label: '✗ Rejeté',          bg: 'bg-gray-100 text-gray-500'   },
  classified      : { label: '🔍 Classifié',      bg: 'bg-blue-100 text-blue-700'   },
  new             : { label: '🆕 Nouveau',         bg: 'bg-violet-100 text-violet-700'},
}

const PLATFORM_ICONS = {
  instagram: Camera,
  facebook : Globe,
  tiktok   : Music,
}
const PLATFORM_COLORS = {
  instagram: 'text-pink-500',
  facebook : 'text-blue-600',
  tiktok   : 'text-gray-900',
}

const cn = (...c) => c.filter(Boolean).join(' ')

export function MessageCard({ message, isSelected, onClick }) {
  const sentiment  = SENTIMENT_CONFIG[message.sentiment] || SENTIMENT_CONFIG.neutral
  const status     = STATUS_CONFIG[message.status] || STATUS_CONFIG.new
  const Icon       = PLATFORM_ICONS[message.platform] || Camera
  const iconColor  = PLATFORM_COLORS[message.platform] || 'text-gray-500'

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-4 border-b border-gray-50 cursor-pointer transition-all hover:bg-gray-50',
        isSelected && 'bg-indigo-50 border-l-4 border-l-indigo-500',
        !message.is_read && !isSelected && 'bg-blue-50/30'
      )}
    >
      {/* Indicateur non lu */}
      {!message.is_read && (
        <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
      )}

      {/* Icône plateforme */}
      <div className={cn('p-2 rounded-lg bg-gray-100 flex-shrink-0', !message.is_read ? '' : 'ml-4')}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-gray-800 truncate">
              {message.author_name || 'Anonyme'}
            </span>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {message.message_type === 'dm' ? '💬 DM' : '💭 Commentaire'}
            </span>
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">{message.created_at}</span>
        </div>

        {/* Texte du message */}
        <p className="text-sm text-gray-700 line-clamp-2 mb-2">{message.text}</p>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', sentiment.bg, sentiment.text)}>
            {sentiment.emoji} {sentiment.label}
          </span>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', status.bg)}>
            {status.label}
          </span>
          {message.brand_voice_score && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
              BV {Math.round(message.brand_voice_score * 100)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}