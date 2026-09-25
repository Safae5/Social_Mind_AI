// frontend/src/components/scheduler/AccountConnector.jsx
import { Camera, Globe, Music, RefreshCw, Trash2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { useMetaOAuth, useTikTokOAuth, useInstagramDirectOAuth, useDisconnectAccount } from '@/hooks/useScheduler'
import { useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { toast } from 'sonner'

const PLATFORM_CONFIG = {
  instagram: { Icon: Camera, color: 'text-pink-500',  bg: 'bg-pink-50',  label: 'Instagram' },
  facebook : { Icon: Globe,     color: 'text-blue-600',  bg: 'bg-blue-50',  label: 'Facebook'  },
  tiktok   : { Icon: Music,     color: 'text-gray-900',  bg: 'bg-gray-50',  label: 'TikTok'    },
}

export default function AccountConnector({ accounts, onAnalyze, isAnalyzing }) {
  const [searchParams]   = useSearchParams()
  const metaOAuth        = useMetaOAuth()
  const tiktokOAuth      = useTikTokOAuth()
  const instagramDirect  = useInstagramDirectOAuth()
  const disconnect       = useDisconnectAccount()

  // Gestion des retours OAuth
  useEffect(() => {
    const success = searchParams.get('oauth_success')
    const error   = searchParams.get('oauth_error')
    if (success) {
      toast.success(`✅ Compte ${success} connecté avec succès !`)
    }
    if (error) {
      toast.error(`❌ Erreur connexion : ${decodeURIComponent(error)}`)
    }
  }, [searchParams])

  const canAddMore = accounts.length < 2

  const handleConnect = (platform) => {
    if (!canAddMore) {
      toast.error('Maximum 2 comptes connectés.')
      return
    }
    if (platform === 'instagram_direct') {
      instagramDirect.mutate()
    } else if (platform === 'instagram' || platform === 'facebook') {
      metaOAuth.mutate()
    } else {
      tiktokOAuth.mutate()
    }
  }

  const handleDisconnect = (account) => {
    if (window.confirm(`Déconnecter @${account.username} (${account.platform}) ?`)) {
      disconnect.mutate({ platform: account.platform, id: account.id, isInstagramDirect: account.is_instagram_direct })
    }
  }

  return (
    <div className="space-y-6">

      {/* Comptes connectés */}
      {accounts.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Comptes connectés ({accounts.length}/2)
          </h3>
          <div className="space-y-3">
            {accounts.map(account => {
              const cfg = PLATFORM_CONFIG[account.platform] || PLATFORM_CONFIG.instagram
              const { Icon } = cfg
              return (
                <div key={account.id}
                     className={`flex items-center gap-4 p-4 rounded-2xl border ${cfg.bg} border-gray-200`}>
                  <div className={`p-2.5 rounded-xl ${cfg.bg}`}>
                    <Icon className={`h-5 w-5 ${cfg.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">@{account.username}</p>
                      {account.token_valid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      {account.token_expiring_soon && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="h-3 w-3" />
                          Token expire bientôt
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 capitalize">
                      {account.platform} · {account.account_type}
                      {account.is_instagram_direct && ' · connexion directe'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {account.followers_count.toLocaleString('fr-FR')} abonnés
                      {account.last_synced_at && ` · Sync: ${new Date(account.last_synced_at).toLocaleDateString('fr-FR')}`}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onAnalyze(account.id)}
                      disabled={isAnalyzing}
                      className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                      {isAnalyzing ? 'Analyse...' : 'Analyser'}
                    </button>
                    <button
                      onClick={() => handleDisconnect(account)}
                      disabled={disconnect.isPending}
                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Déconnecter
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Ajouter un compte */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-2">
          {accounts.length === 0 ? 'Connecter un réseau social' : 'Ajouter un autre compte'}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {canAddMore
            ? `Vous pouvez connecter ${2 - accounts.length} compte(s) supplémentaire(s).`
            : 'Maximum 2 comptes atteint. Déconnectez un compte pour en ajouter un autre.'}
        </p>

        {!canAddMore ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
            ⚠️ Limite de 2 comptes atteinte pour le plan Standard.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { platform: 'instagram',        label: 'Instagram Business', note: 'Via Page Facebook liée',      Icon: Camera, color: 'text-pink-500' },
              { platform: 'instagram_direct', label: 'Instagram direct',   note: 'Sans Page Facebook',          Icon: Camera, color: 'text-fuchsia-500' },
              { platform: 'facebook',         label: 'Facebook Page',      note: 'Page Facebook requise',       Icon: Globe,     color: 'text-blue-600' },
              { platform: 'tiktok',           label: 'TikTok',             note: '⚠️ Approbation API requise',  Icon: Music,     color: 'text-gray-900' },
            ].map(({ platform, label, note, Icon, color }) => (
              <button
                key={platform}
                onClick={() => handleConnect(platform)}
                disabled={metaOAuth.isPending || tiktokOAuth.isPending || instagramDirect.isPending}
                className="flex flex-col items-center gap-3 p-5 bg-white border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-2xl transition-all disabled:opacity-50 text-center"
              >
                <Icon className={`h-8 w-8 ${color}`} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{note}</p>
                </div>
                {(metaOAuth.isPending && ['instagram','facebook'].includes(platform)) ||
                 (tiktokOAuth.isPending && platform === 'tiktok') ||
                 (instagramDirect.isPending && platform === 'instagram_direct') ? (
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-xs text-indigo-600 font-medium">Connecter →</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes importantes */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-medium mb-2">📋 Informations importantes :</p>
        <ul className="space-y-1 text-xs text-blue-600">
          <li>• Instagram nécessite un compte <strong>Business ou Créateur</strong> — via une Page Facebook liée, ou directement sans Page (« Instagram direct »).</li>
          <li>• Les tokens Meta expirent tous les 60 jours et sont <strong>renouvelés automatiquement</strong>.</li>
          <li>• TikTok nécessite une <strong>approbation spéciale</strong> de l'API TikTok Developer.</li>
          <li>• Vos tokens sont <strong>chiffrés</strong> et stockés de façon sécurisée.</li>
        </ul>
      </div>
    </div>
  )
}