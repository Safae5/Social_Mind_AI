// frontend/src/components/hashtags/FavoritesTab.jsx
import { useState } from 'react'
import { Trash2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

const PLATFORM_EMOJI = {
  instagram: '📸', tiktok: '🎵', facebook: '👥', linkedin: '💼', twitter: '🐦',
}

export function FavoritesTab({ favorites, onDelete, onUse, isDeleting }) {
  const [copiedId, setCopied] = useState(null)
  const [search,   setSearch] = useState('')
  const [filter,   setFilter] = useState('all')

  const filtered = (favorites || []).filter(fav => {
    const matchSearch = !search ||
      fav.name.toLowerCase().includes(search.toLowerCase()) ||
      fav.subject.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || fav.platform === filter
    return matchSearch && matchFilter
  })

  const handleCopy = async (fav) => {
    const text = (fav.hashtags || []).join(' ')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(fav.id)
      toast.success('Hashtags copiés !')
      onUse(fav.id)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      toast.error('Erreur de copie.')
    }
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-5xl mb-4">⭐</div>
        <p className="text-lg font-medium text-gray-600">Aucun ensemble sauvegardé</p>
        <p className="text-sm mt-2">Générez des hashtags et cliquez sur "Sauvegarder"</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Filtres */}
      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher dans vos favoris..."
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none"
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
        >
          <option value="all">Toutes plateformes</option>
          {Object.entries(PLATFORM_EMOJI).map(([id, emoji]) => (
            <option key={id} value={id}>{emoji} {id.charAt(0).toUpperCase() + id.slice(1)}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-gray-400">
        {filtered.length} ensemble(s) affiché(s) · {favorites.length}/20 maximum
      </p>

      {/* Liste */}
      <div className="space-y-3">
        {filtered.map(fav => (
          <div key={fav.id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-indigo-200 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{PLATFORM_EMOJI[fav.platform] || '📱'}</span>
                  <h3 className="text-sm font-bold text-gray-800">{fav.name}</h3>
                  {fav.times_used > 0 && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                      Utilisé {fav.times_used}×
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {fav.subject} · {fav.platform} · {new Date(fav.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(fav)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    copiedId === fav.id
                      ? 'bg-green-600 text-white'
                      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  }`}
                >
                  {copiedId === fav.id
                    ? <><Check className="h-3.5 w-3.5" /> Copié !</>
                    : <><Copy className="h-3.5 w-3.5" /> Copier</>}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Supprimer "${fav.name}" ?`)) onDelete(fav.id)
                  }}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Hashtags */}
            <div className="flex flex-wrap gap-1.5">
              {(fav.hashtags || []).map((tag, i) => (
                <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-mono border border-gray-200">
                  {tag}
                </span>
              ))}
            </div>

            {fav.notes && (
              <p className="text-xs text-gray-400 mt-2 italic">{fav.notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}