// frontend/src/components/calendar/SlotEditModal.jsx
import { useState } from 'react'
import { X } from 'lucide-react'
import { POST_TYPE_CONFIG, PLATFORM_EMOJI } from './DaySlotCard'

const PLATFORMS  = ['instagram', 'tiktok', 'facebook', 'linkedin', 'twitter']
const POST_TYPES = ['reel', 'carousel', 'static', 'story', 'video', 'article']

export function SlotEditModal({ slot, onSave, onClose }) {
  const [form, setForm] = useState({
    user_platform : slot.platform     || 'instagram',
    user_post_type: slot.post_type    || 'static',
    user_subject  : slot.subject      || '',
    user_caption  : slot.caption_idea || '',
    user_time     : slot.best_time    || '18:00',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(form) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-800">
              ✏️ Modifier — {slot.day_name}
            </h2>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">

            {/* Plateforme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Plateforme</label>
              <div className="flex gap-2 flex-wrap">
                {PLATFORMS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, user_platform: p }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm transition-colors ${
                      form.user_platform === p
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <span>{PLATFORM_EMOJI[p]}</span>
                    <span className="capitalize">{p}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Type de post */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de publication</label>
              <div className="flex gap-2 flex-wrap">
                {POST_TYPES.map(t => {
                  const cfg = POST_TYPE_CONFIG[t]
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, user_post_type: t }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm transition-colors ${
                        form.user_post_type === t
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <span>{cfg?.emoji}</span>
                      <span>{cfg?.label || t}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Sujet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
              <input
                type="text"
                value={form.user_subject}
                onChange={e => setForm(f => ({ ...f, user_subject: e.target.value }))}
                placeholder="Sujet de la publication..."
                maxLength={300}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              />
            </div>

            {/* Idée de légende */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Idée de légende</label>
              <textarea
                value={form.user_caption}
                rows={3}
                onChange={e => setForm(f => ({ ...f, user_caption: e.target.value }))}
                placeholder="Idée de texte pour la publication..."
                maxLength={2200}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              />
            </div>

            {/* Heure */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Heure de publication
              </label>
              <input
                type="time"
                value={form.user_time}
                onChange={e => setForm(f => ({ ...f, user_time: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}