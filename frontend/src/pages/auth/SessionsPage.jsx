import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Monitor, Smartphone, Tablet, Globe,
  LogOut, Shield, Clock, MapPin,
  AlertTriangle, CheckCircle, RefreshCw,
  Wifi, WifiOff
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useSessions, useRevokeSession, useRevokeOtherSessions, useTokenInfo } from '@/hooks/useSessions'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'

// ── Icône selon le type d'appareil ───────────────────────────
function DeviceIcon({ type, className = 'h-5 w-5' }) {
  const props = { className }
  if (type === 'mobile')  return <Smartphone {...props} />
  if (type === 'tablet')  return <Tablet {...props} />
  return <Monitor {...props} />
}

// ── Badge statut session ──────────────────────────────────────
function SessionBadge({ isCurrent, isExpired }) {
  if (isCurrent) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        Session active
      </span>
    )
  }
  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
        <WifiOff className="h-3 w-3" />
        Expirée
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
      <Wifi className="h-3 w-3" />
      Connectée
    </span>
  )
}

// ── Carte d'une session ───────────────────────────────────────
function SessionCard({ session, onRevoke, revoking }) {
  const [showConfirm, setShowConfirm] = useState(false)

  const lastActive = session.last_active_at
    ? formatDistanceToNow(new Date(session.last_active_at), {
        addSuffix: true,
        locale: fr,
      })
    : 'Inconnu'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        p-4 rounded-xl border transition-all duration-200
        ${session.is_current
          ? 'border-green-200 bg-green-50/50'
          : session.is_expired
            ? 'border-gray-100 bg-gray-50/50 opacity-60'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }
      `}
    >
      <div className="flex items-start justify-between gap-3">

        {/* Icône appareil */}
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
          ${session.is_current ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}
        `}>
          <DeviceIcon type={session.device_type} />
        </div>

        {/* Infos session */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-medium text-gray-900 truncate">
              {session.device_name || 'Appareil inconnu'}
            </span>
            <SessionBadge
              isCurrent={session.is_current}
              isExpired={session.is_expired}
            />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {session.ip_address && (
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {session.ip_address}
              </span>
            )}
            {session.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {session.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastActive}
            </span>
          </div>
        </div>

        {/* Action */}
        {!session.is_current && !session.is_expired && (
          <div className="flex-shrink-0">
            {!showConfirm ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirm(true)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Confirmer ?</span>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    onRevoke(session.id)
                    setShowConfirm(false)
                  }}
                  loading={revoking}
                >
                  Oui
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowConfirm(false)}
                >
                  Non
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Barre de progression du token JWT ────────────────────────
function TokenTimer({ tokenInfo }) {
  if (!tokenInfo) return null

  const totalSeconds  = 60 * 60  // 1 heure par défaut
  const remaining     = tokenInfo.seconds_remaining || 0
  const percentage    = Math.min(100, (remaining / totalSeconds) * 100)
  const minutes       = Math.floor(remaining / 60)
  const seconds       = remaining % 60

  const color = percentage > 50
    ? 'bg-green-500'
    : percentage > 20
      ? 'bg-amber-500'
      : 'bg-red-500'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-violet-600" />
          <span className="text-sm font-medium text-gray-900">Token JWT actuel</span>
        </div>
        <span className="text-xs text-gray-500 font-mono">
          {minutes}m {seconds}s restant
        </span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2">
        <motion.div
          className={`h-2 rounded-full transition-all duration-1000 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">
          JTI : {tokenInfo.token_id?.slice(0, 8)}...
        </span>
        <span className="text-xs text-gray-400">
          Plan : {tokenInfo.current_plan || 'N/A'}
        </span>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────
export default function SessionsPage() {
  const { user }      = useAuth()
  const { data, isLoading, refetch, isFetching } = useSessions()
  const { data: tokenInfo } = useTokenInfo()
  const revokeMutation      = useRevokeSession()
  const revokeOthersMutation = useRevokeOtherSessions()

  const sessions      = data?.sessions || []
  const activeCount   = data?.active_count || 0
  const otherSessions = sessions.filter(s => !s.is_current && !s.is_expired)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Chargement des sessions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Appareils connectés
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeCount} session{activeCount > 1 ? 's' : ''} active{activeCount > 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          loading={isFetching}
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Timer JWT */}
      <TokenTimer tokenInfo={tokenInfo} />

      {/* Alerte si plusieurs sessions */}
      {otherSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl"
        >
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              {otherSessions.length} autre{otherSessions.length > 1 ? 's' : ''} session{otherSessions.length > 1 ? 's' : ''} détectée{otherSessions.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Si vous ne reconnaissez pas certains appareils, déconnectez-les immédiatement.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => revokeOthersMutation.mutate()}
            loading={revokeOthersMutation.isPending}
            className="flex-shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            Tout déconnecter
          </Button>
        </motion.div>
      )}

      {/* Liste des sessions */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Sessions
        </h2>

        <AnimatePresence mode="popLayout">
          {sessions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-10 text-gray-400"
            >
              <Monitor className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucune session enregistrée</p>
            </motion.div>
          ) : (
            sessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                onRevoke={(id) => revokeMutation.mutate(id)}
                revoking={
                  revokeMutation.isPending &&
                  revokeMutation.variables === session.id
                }
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Info sécurité */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="flex items-start gap-2">
          <CheckCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Les tokens JWT expirent automatiquement après <strong>60 minutes</strong>.
              Les refresh tokens durent <strong>14 jours</strong>.
              La déconnexion révoque immédiatement l'accès.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}