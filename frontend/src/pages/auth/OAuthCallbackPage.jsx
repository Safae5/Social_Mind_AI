import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api/auth'
import { toast } from 'sonner'

// ── Messages d'erreur lisibles ────────────────────────────────
const ERROR_MESSAGES = {
  'no_email':           'Votre compte Google/Facebook ne partage pas d\'adresse e-mail.',
  'account_suspended':  'Votre compte a été suspendu. Contactez le support.',
  'oauth_failed':       'La connexion OAuth a échoué. Réessayez.',
  'access_denied':      'Vous avez refusé l\'autorisation. Réessayez.',
  'no_email':           'Impossible de récupérer votre e-mail depuis ce compte.',
  default:              'Une erreur est survenue lors de la connexion.',
}

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()
  const { login }      = useAuth()
  const [status, setStatus]   = useState('loading') // loading | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const token        = searchParams.get('token')
    const refreshToken = searchParams.get('refresh_token')
    const error        = searchParams.get('error')
    const provider     = searchParams.get('provider')

    // ── Erreur OAuth ──────────────────────────────────────────
    if (error) {
      const msg = ERROR_MESSAGES[error] || ERROR_MESSAGES.default
      setErrorMsg(msg)
      setStatus('error')
      return
    }

    // ── Token reçu → récupère l'utilisateur ──────────────────
    if (token) {
      // Stocke temporairement pour que l'intercepteur Axios l'utilise
      localStorage.setItem('auth_token', token)

      authApi.me()
        .then(response => {
          const user = response.data.data.user

          // Connexion réussie
          login(user, token, refreshToken)
          setUserName(user.first_name)
          setStatus('success')

          toast.success(`Bienvenue ${user.first_name} ! 🎉`)

          // Redirige après 1.5 secondes (laisse voir l'écran de succès)
          setTimeout(() => {
            const path = user.role === 'admin'    ? '/admin'
                       : user.role === 'business' ? '/dashboard/professional'
                       : '/dashboard'
            navigate(path, { replace: true })
          }, 1500)
        })
        .catch(() => {
          localStorage.removeItem('auth_token')
          setErrorMsg('Impossible de récupérer votre profil. Réessayez.')
          setStatus('error')
        })
    } else {
      setErrorMsg('Aucun token reçu. Réessayez.')
      setStatus('error')
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 w-full max-w-sm text-center">

        {/* ── Chargement ── */}
        {status === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-violet-600 animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Connexion en cours...</h2>
              <p className="text-sm text-gray-500 mt-1">Vérification de votre compte</p>
            </div>
            {/* Barre de progression */}
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
              <motion.div
                className="bg-violet-600 h-1.5 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>
        )}

        {/* ── Succès ── */}
        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center"
            >
              <CheckCircle className="h-9 w-9 text-green-600" />
            </motion.div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Bienvenue {userName} ! 🎉
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Redirection vers votre tableau de bord...
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Erreur ── */}
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-9 w-9 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Connexion échouée</h2>
              <p className="text-sm text-gray-500 mt-1">{errorMsg}</p>
            </div>
            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                onClick={() => window.location.href = 'http://localhost:8000/api/auth/google'}
                className="w-full px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
              >
                Réessayer avec Google
              </button>
              <Link
                to="/login"
                className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                Retour à la connexion
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}