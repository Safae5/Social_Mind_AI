// frontend/src/components/scheduler/UpcomingPostsList.jsx
import { XCircle, Camera, Globe, Music } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const PLATFORM_ICONS  = { instagram: Camera, facebook: Globe, tiktok: Music }
const PLATFORM_COLORS = { instagram: 'text-pink-500', facebook: 'text-blue-600', tiktok: 'text-gray-900' }

export default function UpcomingPostsList({ posts, onCancel, isCancelling }) {
  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">⏰ Prochaines publications</h3>
        <p className="text-sm text-gray-400 text-center py-6">
          Aucune publication planifiée.<br />
          <span className="text-indigo-500">Ajoutez du contenu à la file d'attente !</span>
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        ⏰ Prochaines publications ({posts.length})
      </h3>
      <div className="space-y-3">
        {posts.slice(0, 5).map(post => {
          const Icon  = PLATFORM_ICONS[post.platform] || Camera
          const color = PLATFORM_COLORS[post.platform] || 'text-gray-500'
          const scheduledAt = new Date(post.scheduled_at)
          return (
            <div key={post.id}
                 className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
              <div className={`p-2 rounded-lg bg-gray-50`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 line-clamp-1">{post.caption}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-gray-500">
                    {scheduledAt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {' à '}
                    {scheduledAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <span className="text-xs text-indigo-500">
                    ({formatDistanceToNow(scheduledAt, { locale: fr, addSuffix: true })})
                  </span>
                  {post.ai_optimized && (
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">
                      ✨ IA
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg font-medium">
                  {post.status === 'pending' ? '⏳ Planifié' : post.status}
                </span>
                <button
                  onClick={() => window.confirm('Annuler cette publication ?') && onCancel(post.id)}
                  disabled={isCancelling}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                  title="Annuler"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}