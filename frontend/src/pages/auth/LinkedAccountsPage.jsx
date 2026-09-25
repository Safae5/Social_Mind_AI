import { motion } from 'framer-motion'
import { Link2, Link2Off, CheckCircle, AlertCircle } from 'lucide-react'
import { useLinkedAccounts, useUnlinkAccount } from '@/hooks/useOAuth'
import { Button } from '@/components/ui/Button'

// ── Icônes providers ──────────────────────────────────────────
const ProviderIcon = ({ provider }) => {
  if (provider === 'google') {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    )
  }
  return (
    <svg className="h-5 w-5" fill="#1877F2" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

// ── Ligne d'un provider ───────────────────────────────────────
function ProviderRow({ provider, linkedAccount, onUnlink, unlinking }) {
  const isLinked   = !!linkedAccount
  const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1)

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
    >
      {/* Provider info */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
          <ProviderIcon provider={provider} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{capitalize(provider)}</p>
          {isLinked ? (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {linkedAccount.email || linkedAccount.name || 'Compte lié'}
            </p>
          ) : (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Non lié
            </p>
          )}
        </div>
      </div>

      {/* Action */}
      {isLinked ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUnlink(provider)}
          loading={unlinking}
          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
        >
          <Link2Off className="h-3.5 w-3.5" />
          Délier
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            window.location.href = `http://localhost:8000/api/auth/${provider}`
          }}
        >
          <Link2 className="h-3.5 w-3.5" />
          Lier
        </Button>
      )}
    </motion.div>
  )
}

// ── Page principale ───────────────────────────────────────────
export default function LinkedAccountsPage() {
  const { data: accounts, isLoading } = useLinkedAccounts()
  const unlinkMutation = useUnlinkAccount()

  const getLinkedAccount = (provider) =>
    accounts?.find(a => a.provider === provider) || null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Comptes liés</h2>
        <p className="text-sm text-gray-500 mt-1">
          Liez vos comptes sociaux pour vous connecter plus rapidement.
        </p>
      </div>

      <div className="space-y-3">
        {['google', 'facebook'].map(provider => (
          <ProviderRow
            key={provider}
            provider={provider}
            linkedAccount={getLinkedAccount(provider)}
            onUnlink={(p) => unlinkMutation.mutate(p)}
            unlinking={
              unlinkMutation.isPending &&
              unlinkMutation.variables === provider
            }
          />
        ))}
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-700">
          <strong>Note :</strong> Si vous déliez tous vos comptes sociaux,
          assurez-vous d'avoir un mot de passe configuré pour pouvoir vous reconnecter.
        </p>
      </div>
    </div>
  )
}