// frontend/src/components/hashtags/HashtagResults.jsx
import { useState } from 'react'
import { Copy, Check, Star } from 'lucide-react'
import { toast } from 'sonner'

const CAT_CONFIG = {
  high  : { emoji: '🔥', label: 'Haut Volume',  bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700',   badge: 'bg-red-100 text-red-700'    },
  medium: { emoji: '⚡', label: 'Moyen Volume', bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  niche : { emoji: '🎯', label: 'Niche',         bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
}

export function HashtagResults({ results, fromCache, subject, platform, onSaveFavorite, isSaving }) {
  const [copiedKey,    setCopied]     = useState(null)
  const [favName,      setFavName]    = useState('')
  const [showSaveForm, setShowSaveForm]= useState(false)
  const [selectedTags, setSelectedTags]= useState(new Set())

  if (!results) return null
  const { categorized, optimal_set, strategy, total } = results

  const copyText = async (tags, key) => {
    const text = Array.isArray(tags)
      ? tags.map(t => t.hashtag || t).join(' ')
      : tags
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      toast.success('Hashtags copiés !')
      setTimeout(() => setCopied(null), 2000)
    } catch {
      toast.error('Erreur de copie.')
    }
  }

  const toggleTag = (tag) => {
    setSelectedTags(prev => {
      const next = new Set(prev)
      next.has(tag) ? next.delete(tag) : next.add(tag)
      return next
    })
  }

  const handleSave = () => {
    if (!favName.trim()) return
    const tagsToSave = selectedTags.size > 0 ? [...selectedTags] : optimal_set
    onSaveFavorite({
      name     : favName.trim(),
      subject  : subject || 'Sujet',
      platform : platform || 'instagram',
      hashtags : tagsToSave,
      categorized: {
        high  : categorized.high?.map(h => h.hashtag) || [],
        medium: categorized.medium?.map(h => h.hashtag) || [],
        niche : categorized.niche?.map(h => h.hashtag) || [],
      },
    })
    setShowSaveForm(false)
    setFavName('')
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{total} hashtags générés</h2>
          {fromCache && <p className="text-xs text-indigo-500 mt-0.5">⚡ Résultats mis en cache (24h)</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => copyText(optimal_set, 'optimal')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              copiedKey === 'optimal'
                ? 'bg-green-600 text-white'
                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
            }`}
          >
            {copiedKey === 'optimal' ? <><Check className="h-3.5 w-3.5" /> Copié !</> : <><Copy className="h-3.5 w-3.5" /> Ensemble optimal</>}
          </button>
          <button
            onClick={() => setShowSaveForm(!showSaveForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-200 transition-colors"
          >
            <Star className="h-3.5 w-3.5" /> Sauvegarder
          </button>
        </div>
      </div>

      {/* Formulaire sauvegarde */}
      {showSaveForm && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm font-medium text-amber-800 mb-3">
            ⭐ Nommer cet ensemble
            {selectedTags.size > 0
              ? ` (${selectedTags.size} sélectionnés)`
              : ` (${optimal_set.length} hashtags optimaux)`}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={favName}
              onChange={e => setFavName(e.target.value)}
              placeholder="Ex: Mode Maroc Instagram 2024"
              maxLength={100}
              className="flex-1 border border-amber-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-300 focus:outline-none"
            />
            <button
              onClick={handleSave}
              disabled={!favName.trim() || isSaving}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              {isSaving ? '⏳' : '💾 Sauvegarder'}
            </button>
            <button onClick={() => setShowSaveForm(false)} className="px-3 py-2 text-amber-600 hover:text-amber-800">✕</button>
          </div>
          <p className="text-xs text-amber-600 mt-2">
            💡 Cliquez sur des hashtags pour les sélectionner, ou l'ensemble optimal sera sauvegardé.
          </p>
        </div>
      )}

      {/* Conseil stratégique */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <p
          className="text-sm text-blue-800 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: strategy.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          }}
        />
      </div>

      {/* 3 catégories */}
      {['high', 'medium', 'niche'].map(cat => {
        const conf = CAT_CONFIG[cat]
        const tags = categorized[cat] || []
        if (!tags.length) return null
        return (
          <div key={cat} className={`${conf.bg} border ${conf.border} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{conf.emoji}</span>
                <div>
                  <h3 className={`text-sm font-bold ${conf.text}`}>{conf.label}</h3>
                  <p className="text-xs text-gray-500">
                    {cat === 'high'   && 'Larges audiences · Forte concurrence · Bonne découverte'}
                    {cat === 'medium' && 'Audiences ciblées · Bon équilibre portée/engagement'}
                    {cat === 'niche'  && 'Très ciblé · Fort engagement · Audience qualifiée'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${conf.badge}`}>
                  {tags.length}
                </span>
                <button
                  onClick={() => copyText(tags, cat)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    copiedKey === cat
                      ? 'bg-green-600 text-white'
                      : `bg-white/80 ${conf.text} hover:bg-white`
                  }`}
                >
                  {copiedKey === cat ? '✅' : '📋 Copier'}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, idx) => {
                const tagStr    = tag.hashtag || tag
                const isSelected= selectedTags.has(tagStr)
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleTag(tagStr)}
                    title={`${tag.description || ''} · ${tag.estimated || ''}`}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 scale-105 shadow-sm'
                        : `bg-white/80 ${conf.text} border-white/50 hover:bg-white hover:scale-105`
                    }`}
                  >
                    {tagStr}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Ensemble optimal — dark card */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-white">🎯 Ensemble Optimal (20/40/40)</h3>
            <p className="text-xs text-gray-400 mt-0.5">20% haut + 40% moyen + 40% niche</p>
          </div>
          <button
            onClick={() => copyText(optimal_set, 'optimal-dark')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              copiedKey === 'optimal-dark'
                ? 'bg-green-600 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {copiedKey === 'optimal-dark' ? '✅ Copié !' : '📋 Copier tout'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {optimal_set.map((tag, idx) => (
            <span key={idx} className="px-2.5 py-1 bg-white/10 text-white rounded-full text-xs font-mono border border-white/20">
              {tag}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-500 font-mono break-all leading-relaxed">
          {optimal_set.join(' ')}
        </p>
      </div>
    </div>
  )
}