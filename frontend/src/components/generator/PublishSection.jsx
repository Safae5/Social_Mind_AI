// frontend/src/components/generator/PublishSection.jsx
import { useState, useEffect } from 'react'
import { schedulerApi } from '@/api/schedulerApi'
import { usePublishContent } from '@/hooks/useContent'

const PLATFORM_ICONS = {
  instagram: '📸', tiktok: '🎵', facebook: '👥',
  linkedin : '💼', twitter: '🐦',
}

export function PublishSection({
  contentId,
  selectedVariant,
  variants,
  imageUrl,
  videoUrl,
  onSuccess,
  onBack,
}) {
  const [accounts,    setAccounts]   = useState([])
  const [selectedAcc, setSelectedAcc]= useState('')
  const [confirmed,   setConfirmed]  = useState(false)
  const [loadingAccs, setLoadingAccs]= useState(true)

  const publishMutation = usePublishContent()
  const variant         = variants.find(v => v.id === selectedVariant)

  useEffect(() => {
    schedulerApi.getAccounts()
      .then(r => {
        const accs = r.data.data.accounts || []
        setAccounts(accs)
        if (accs.length === 1) setSelectedAcc(accs[0].id.toString())
      })
      .catch(console.error)
      .finally(() => setLoadingAccs(false))
  }, [])

  const handlePublish = () => {
    if (!confirmed || !selectedAcc) return
    publishMutation.mutate(
      { id: contentId, data: { selected_variant: selectedVariant, social_account_id: parseInt(selectedAcc) } },
      { onSuccess }
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Récapitulatif variante */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          📋 Récapitulatif — Variante {selectedVariant}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              Légende — {variant?.style}
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {variant?.caption}
            </p>
            {variant?.hashtags?.length > 0 && (
              <p className="text-xs text-indigo-500 mt-2">{variant.hashtags.join(' ')}</p>
            )}
          </div>

          <div className="space-y-3">
            {imageUrl && (
              <div className="rounded-xl overflow-hidden border border-gray-100">
                <img src={imageUrl} alt="Image" className="w-full h-36 object-cover" />
                <p className="text-xs text-center text-gray-400 py-1">🖼️ SDXL-Turbo</p>
              </div>
            )}
            {videoUrl && (
              <div className="rounded-xl overflow-hidden border border-gray-100">
                <video src={videoUrl} className="w-full h-36 object-cover" muted />
                <p className="text-xs text-center text-gray-400 py-1">🎬 ModelScope T2V</p>
              </div>
            )}
            {!imageUrl && !videoUrl && (
              <div className="h-36 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200">
                Aucun média
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sélection du compte */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">📱 Compte de Publication</h2>

        {loadingAccs ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">🔗</div>
            <p className="text-sm">Aucun compte connecté</p>
            <a href="/dashboard/settings" className="text-indigo-600 text-sm underline mt-1 inline-block">
              Connecter un compte →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map(account => (
              <label
                key={account.id}
                className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  selectedAcc === account.id.toString()
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="social_account"
                  value={account.id}
                  checked={selectedAcc === account.id.toString()}
                  onChange={e => setSelectedAcc(e.target.value)}
                  className="sr-only"
                />
                <span className="text-2xl">{PLATFORM_ICONS[account.platform] || '📱'}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800 capitalize">{account.platform}</p>
                  <p className="text-xs text-gray-400">@{account.username}</p>
                  {account.followers_count > 0 && (
                    <p className="text-xs text-gray-400">{account.followers_count.toLocaleString('fr-FR')} abonnés</p>
                  )}
                </div>
                {selectedAcc === account.id.toString() && (
                  <span className="ml-auto text-indigo-600 text-lg">✓</span>
                )}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-amber-800 mb-2">⚠️ Autorisation de Publication</h3>
        <p className="text-sm text-amber-700 mb-4">
          En cliquant sur "Confirmer et Publier", vous autorisez Social Mind AI à publier ce contenu
          directement sur votre compte. Cette action est immédiate et irréversible depuis l'application.
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
          />
          <span className="text-sm text-amber-800 font-medium">
            J'approuve ce contenu et j'autorise sa publication automatique sur le compte sélectionné.
          </span>
        </label>
      </div>

      {/* Erreur */}
      {publishMutation.isError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          ❌ {publishMutation.error?.response?.data?.message || 'Échec de la publication.'}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          ← Retour
        </button>
        <button
          onClick={handlePublish}
          disabled={publishMutation.isPending || !confirmed || !selectedAcc || accounts.length === 0}
          className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {publishMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Publication en cours...
            </span>
          ) : '✅ Confirmer et Publier'}
        </button>
      </div>
    </div>
  )
}