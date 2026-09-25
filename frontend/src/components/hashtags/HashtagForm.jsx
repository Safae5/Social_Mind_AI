// frontend/src/components/hashtags/HashtagForm.jsx
import { useState } from 'react'
import { Search } from 'lucide-react'

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', emoji: '📸' },
  { id: 'tiktok',    label: 'TikTok',    emoji: '🎵' },
  { id: 'facebook',  label: 'Facebook',  emoji: '👥' },
  { id: 'linkedin',  label: 'LinkedIn',  emoji: '💼' },
  { id: 'twitter',   label: 'Twitter/X', emoji: '🐦' },
]

const cn = (...c) => c.filter(Boolean).join(' ')

export function HashtagForm({ onSubmit, onLoadTrends, isLoading, isTrending, hasResults }) {
  const [subject,    setSubject]   = useState('')
  const [platform,   setPlatform]  = useState('instagram')
  const [language,   setLanguage]  = useState('Français')
  const [nHashtags,  setNHashtags] = useState(25)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!subject.trim()) return
    onSubmit({ subject: subject.trim(), platform, language, n_hashtags: nHashtags })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">

      {/* Sujet */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          🔍 Votre sujet ou niche <span className="text-red-500">*</span>
        </label>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Ex: mode femme marocaine, fitness végétalien, recettes rapides, coaching entrepreneuriat..."
          maxLength={300}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          required
        />
        <p className="text-xs text-gray-400 mt-1">{subject.length}/300 caractères</p>
      </div>

      {/* Plateforme */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">📱 Plateforme</label>
        <div className="flex gap-2 flex-wrap">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all',
                platform === p.id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              )}
            >
              <span>{p.emoji}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Langue + Nombre */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-700 mb-2">🌍 Langue</label>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          >
            <option>Français</option>
            <option>English</option>
            <option>Arabe</option>
            <option>Mixte FR/EN</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🔢 Nombre : <span className="text-indigo-600 font-bold">{nHashtags}</span>
          </label>
          <input
            type="range"
            min={15} max={30} step={5}
            value={nHashtags}
            onChange={e => setNHashtags(parseInt(e.target.value))}
            className="w-full accent-indigo-600 mt-2"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>15</span><span>20</span><span>25</span><span>30</span>
          </div>
        </div>
      </div>

      {/* Boutons */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isLoading || !subject.trim()}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Génération...</>
          ) : (
            <><Search className="h-4 w-4" /> Générer {nHashtags} Hashtags</>
          )}
        </button>
        {hasResults && (
          <button
            type="button"
            onClick={onLoadTrends}
            disabled={isTrending}
            className="py-3 px-5 border border-indigo-200 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-50 disabled:opacity-50 whitespace-nowrap transition-colors"
          >
            {isTrending ? (
              <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto" />
            ) : '📈 Tendances'}
          </button>
        )}
      </div>
    </form>
  )
}