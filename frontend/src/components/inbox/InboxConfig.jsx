// frontend/src/components/inbox/InboxConfig.jsx
import { useState, useEffect, startTransition } from 'react'
import { X } from 'lucide-react'
import { useInboxConfig, useUpdateConfig } from '@/hooks/useInbox'

const PLATFORM_EMOJI = {
  instagram: '📸', tiktok: '🎵', facebook: '👥',
}

export function InboxConfig({ accounts, onClose }) {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || null)
  const [localConfig,       setLocalConfig]       = useState(null)

  const { data: config, isLoading } = useInboxConfig(selectedAccountId)
  const updateMutation              = useUpdateConfig()

  // ✅ Fix : startTransition enveloppe setState → n'est plus "directement synchrone"
  // dans le corps de l'effect → satisfait le React Compiler
  useEffect(() => {
    if (config) {
      startTransition(() => {
        setLocalConfig({ ...config })
      })
    }
  }, [config])

  const toggle = (key) => {
    setLocalConfig(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = () => {
    if (!localConfig || !selectedAccountId) return
    updateMutation.mutate({
      accountId: selectedAccountId,
      data     : localConfig,
    })
  }

  const updateBrandExample = (index, value) => {
    const examples = [...(localConfig?.brand_examples || ['', '', ''])]
    examples[index] = value
    setLocalConfig(prev => ({ ...prev, brand_examples: examples }))
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">⚙️ Configuration du Répondeur</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Sélection compte */}
          {accounts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Compte social</label>
              <div className="flex gap-2 flex-wrap">
                {accounts.map(acc => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
                      selectedAccountId === acc.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <span>{PLATFORM_EMOJI[acc.platform] || '📱'}</span>
                    <span>@{acc.username}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          )}

          {localConfig && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Règles auto-réponse */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">🤖 Règles d'Auto-Réponse</h3>
                {[
                  { key: 'auto_reply_positive',  label: 'Auto-répondre aux positifs 🟢', desc: 'Sans approbation' },
                  { key: 'auto_reply_questions', label: 'Auto-répondre aux questions 🔵', desc: 'Questions simples' },
                  { key: 'auto_hide_spam',       label: 'Masquer le spam auto ⚫',        desc: 'Via Meta Graph API' },
                  { key: 'auto_flag_negative',   label: 'Signaler les négatifs 🔴',       desc: 'Revue humaine' },
                ].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer">
                    <div className="relative mt-0.5 flex-shrink-0" onClick={() => toggle(key)}>
                      <div className={`w-10 h-6 rounded-full transition-colors ${localConfig[key] ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mt-1 ${localConfig[key] ? 'translate-x-5' : 'translate-x-1'}`} />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Voix de marque */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">🎨 Voix de Marque</h3>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nom de la marque</label>
                  <input
                    type="text"
                    value={localConfig.brand_name || ''}
                    onChange={e => setLocalConfig(p => ({ ...p, brand_name: e.target.value }))}
                    placeholder="ex: Ma Boutique"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Exemples de réponses (1-3)</label>
                  {[0, 1, 2].map(i => (
                    <textarea
                      key={i}
                      rows={2}
                      value={(localConfig.brand_examples || ['', '', ''])[i] || ''}
                      onChange={e => updateBrandExample(i, e.target.value)}
                      placeholder={`Exemple ${i + 1} de réponse type...`}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2 resize-none focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Boutons */}
          {localConfig && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {updateMutation.isPending ? '⏳ Sauvegarde...' :
                 updateMutation.isSuccess ? '✅ Sauvegardé !' : '💾 Sauvegarder'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}