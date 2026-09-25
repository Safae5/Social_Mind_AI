// frontend/src/components/scheduler/ContentQueueList.jsx
import { useState } from 'react'
import { Trash2, Camera, Globe, Music } from 'lucide-react'

const PLATFORM_ICONS = { instagram: Camera, facebook: Globe, tiktok: Music }
const PLATFORM_COLORS = {
  instagram: 'text-pink-500', facebook: 'text-blue-600', tiktok: 'text-gray-900'
}

export default function ContentQueueList({
  queue, accounts, isLoading, onAdd, onRemove, isRemoving
}) {
  const [form, setForm] = useState({
    social_account_id: accounts[0]?.id?.toString() || '',
    caption    : '',
    hashtags   : '',
    media_url  : '',
    media_type : 'image',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onAdd({
      social_account_id: parseInt(form.social_account_id),
      caption   : form.caption,
      hashtags  : form.hashtags ? form.hashtags.split(' ').filter(h => h.startsWith('#')) : [],
      media_url : form.media_url || null,
      media_type: form.media_type,
      source    : 'manual',
    })
    setForm(f => ({ ...f, caption: '', hashtags: '' }))
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Formulaire ajout */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">📝 Ajouter du contenu</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <select
            value={form.social_account_id}
            onChange={e => setForm(f => ({ ...f, social_account_id: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
          >
            {accounts.length === 0 && <option value="">Aucun compte connecté</option>}
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.platform} — @{acc.username}
              </option>
            ))}
          </select>

          <textarea
            value={form.caption}
            onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
            rows={4}
            placeholder="Votre légende..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            required
          />

          <input
            value={form.hashtags}
            onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))}
            placeholder="#hashtag1 #hashtag2"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />

          <input
            value={form.media_url}
            onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))}
            placeholder="URL de l'image/vidéo (optionnel)"
            type="url"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />

          <div className="flex gap-2">
            {['image', 'video', 'reel', 'carousel'].map(type => (
              <button key={type} type="button"
                      onClick={() => setForm(f => ({ ...f, media_type: type }))}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        form.media_type === type
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading || !form.caption.trim() || !form.social_account_id || accounts.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {isLoading ? '⏳ Ajout...' : '📅 Ajouter à la File d\'Attente'}
          </button>
        </form>
      </div>

      {/* Liste de la file */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          📋 File d'Attente ({queue.length} contenu{queue.length !== 1 ? 's' : ''})
        </h3>
        {queue.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm font-medium">File d'attente vide</p>
            <p className="text-xs mt-1">Ajoutez du contenu à gauche</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {queue.map((item, idx) => {
              const platform = item.social_account?.platform
              const Icon = PLATFORM_ICONS[platform] || Camera
              return (
                <div key={item.id}
                     className="flex items-start gap-3 bg-white border border-gray-100 rounded-2xl p-3 hover:border-indigo-200 transition-colors">
                  <span className="flex-shrink-0 w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-3.5 w-3.5 ${PLATFORM_COLORS[platform] || 'text-gray-500'}`} />
                      <span className="text-xs text-gray-500 capitalize">{platform}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.status === 'scheduled'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.status === 'scheduled' ? '✅ Planifié' : '⏳ En attente'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{item.caption}</p>
                    {item.hashtags?.length > 0 && (
                      <p className="text-xs text-indigo-500 mt-1">
                        {item.hashtags.slice(0, 4).join(' ')}
                        {item.hashtags.length > 4 && ` +${item.hashtags.length - 4}`}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onRemove(item.id)}
                    disabled={isRemoving}
                    className="flex-shrink-0 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}