// frontend/src/components/inbox/ReplyEditor.jsx
import { useState, useEffect } from 'react'
import { RefreshCw, Send, X, Flag, Check } from 'lucide-react'

const SENTIMENT_CONFIG = {
  positive: { emoji: '🟢', label: 'Positif',  color: 'text-green-700', bg: 'bg-green-50'  },
  question: { emoji: '🔵', label: 'Question', color: 'text-blue-700',  bg: 'bg-blue-50'   },
  negative: { emoji: '🔴', label: 'Négatif',  color: 'text-red-700',   bg: 'bg-red-50'    },
  neutral : { emoji: '⚪', label: 'Neutre',   color: 'text-gray-700',  bg: 'bg-gray-50'   },
  spam    : { emoji: '⚫', label: 'Spam',     color: 'text-gray-500',  bg: 'bg-gray-100'  },
}

export function ReplyEditor({
  message,
  onApprove,
  onReject,
  onFlag,
  onRegenerate,
  isApproving,
  isRejecting,
  isFlagging,
  isRegenerating,
  onClose,
}) {
  const [replyText, setReplyText] = useState('')

  useEffect(() => {
    setReplyText(message?.ai_reply || message?.final_reply || '')
  }, [message?.id])

  if (!message) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-lg font-medium">Sélectionnez un message</p>
          <p className="text-sm">Cliquez sur un message pour voir les détails et la réponse IA</p>
        </div>
      </div>
    )
  }

  const sentiment = SENTIMENT_CONFIG[message.sentiment] || SENTIMENT_CONFIG.neutral
  const isPublished = message.status === 'published'
  const isHidden    = message.status === 'hidden'
  const canReply    = !isPublished && !isHidden

  const handleApprove = () => {
    if (!replyText.trim()) return
    onApprove({ id: message.id, replyText })
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">{sentiment.emoji}</span>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {message.author_name || 'Anonyme'}
              <span className="text-gray-400 font-normal ml-2">
                · {message.message_type === 'dm' ? 'Message Direct' : 'Commentaire'} {message.platform}
              </span>
            </p>
            <p className="text-xs text-gray-400">{message.created_at}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* ── Message original ── */}
        <div className={`rounded-xl p-4 border ${sentiment.bg} border-opacity-50`}>
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
            Message reçu
          </p>
          <p className="text-sm text-gray-800 leading-relaxed">{message.text}</p>
          {message.post_caption && (
            <p className="text-xs text-gray-400 mt-2 italic">
              Contexte : {message.post_caption}
            </p>
          )}
        </div>

        {/* ── Infos classification ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sentiment.bg} ${sentiment.color}`}>
            {sentiment.emoji} {sentiment.label}
            {message.sentiment_confidence && ` (${Math.round(message.sentiment_confidence * 100)}%)`}
          </span>
          {message.toxicity_score && message.toxicity_score > 0.3 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600">
              ⚠️ Toxicité : {Math.round(message.toxicity_score * 100)}%
            </span>
          )}
          {message.brand_voice_score && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-600">
              🎨 Voix marque : {Math.round(message.brand_voice_score * 100)}%
            </span>
          )}
        </div>

        {/* ── Message si masqué ── */}
        {isHidden && (
          <div className="bg-gray-100 rounded-xl p-4 text-center text-sm text-gray-500">
            ⚫ Ce message a été masqué automatiquement (spam détecté).
          </div>
        )}

        {/* ── Message si déjà publié ── */}
        {isPublished && message.final_reply && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-green-600 mb-2">✅ Réponse publiée</p>
            <p className="text-sm text-gray-700">{message.final_reply}</p>
          </div>
        )}

        {/* ── Éditeur de réponse ── */}
        {canReply && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">
                🤖 Réponse générée par Mistral 7B
              </label>
              <button
                onClick={() => onRegenerate(message.id)}
                disabled={isRegenerating}
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? 'Régénération...' : 'Régénérer'}
              </button>
            </div>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              rows={4}
              placeholder="La réponse IA apparaîtra ici. Vous pouvez la modifier avant publication."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">{replyText.length} caractères</p>

            {/* Avertissement négatif */}
            {message.sentiment === 'negative' && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                ⚠️ Commentaire négatif : Vérifiez attentivement la réponse avant de publier.
                Considérez de répondre en privé.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      {canReply && (
        <div className="p-5 border-t border-gray-100 space-y-3">
          {/* Bouton principal */}
          <button
            onClick={handleApprove}
            disabled={isApproving || !replyText.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isApproving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publication...</>
            ) : (
              <><Send className="h-4 w-4" /> ✅ Approuver et Publier</>
            )}
          </button>

          {/* Actions secondaires */}
          <div className="flex gap-2">
            <button
              onClick={() => onFlag(message.id)}
              disabled={isFlagging}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
            >
              <Flag className="h-3.5 w-3.5" />
              {isFlagging ? 'Signalement...' : 'Signaler'}
            </button>
            <button
              onClick={() => onReject(message.id)}
              disabled={isRejecting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              {isRejecting ? 'Rejet...' : 'Rejeter'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}