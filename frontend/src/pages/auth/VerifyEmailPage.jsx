import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { MailCheck, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import AuthLayout from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { useVerifyEmail, useResendVerification } from '@/hooks/useAuth'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')
  const [status, setStatus] = useState('pending') // pending | success | error

  const verifyMutation  = useVerifyEmail()
  const resendMutation  = useResendVerification()

  // Vérifie automatiquement si token dans l'URL
  useEffect(() => {
    if (token && email) {
      verifyMutation.mutate(
        { token, email },
        {
          onSuccess: () => setStatus('success'),
          onError:   () => setStatus('error'),
        }
      )
    }
  }, [token, email])

  // Si on vérifie automatiquement
  if (token && email) {
    return (
      <AuthLayout title="Vérification en cours...">
        <div className="text-center py-6">
          {verifyMutation.isPending && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full mx-auto"
            />
          )}

          {status === 'success' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">E-mail vérifié !</h2>
              <p className="text-gray-500 mb-6">Votre compte est maintenant actif.</p>
              <Link to="/login">
                <Button size="lg" className="w-full">Se connecter</Button>
              </Link>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Lien invalide</h2>
              <p className="text-gray-500 mb-6">
                {verifyMutation.error?.response?.data?.message || 'Ce lien est expiré ou invalide.'}
              </p>
              <Button
                onClick={() => resendMutation.mutate(email)}
                loading={resendMutation.isPending}
                size="lg"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4" />
                Renvoyer un nouveau lien
              </Button>
            </motion.div>
          )}
        </div>
      </AuthLayout>
    )
  }

  // Page d'attente (sans token)
  return (
    <AuthLayout
      title="Vérifiez votre e-mail"
      subtitle="Un lien de vérification a été envoyé"
    >
      <div className="text-center py-4">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <MailCheck className="h-8 w-8 text-violet-600" />
        </motion.div>

        <p className="text-gray-600 text-sm mb-6">
          Nous avons envoyé un lien de vérification à votre adresse e-mail.
          Cliquez dessus pour activer votre compte.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 mb-6">
          💡 Vérifiez aussi vos spams si vous ne trouvez pas l'e-mail.
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => resendMutation.mutate(email)}
          loading={resendMutation.isPending}
        >
          <RefreshCw className="h-4 w-4" />
          Renvoyer l'e-mail de vérification
        </Button>

        <Link to="/login" className="block mt-4 text-sm text-gray-500 hover:text-gray-700">
          ← Retour à la connexion
        </Link>
      </div>
    </AuthLayout>
  )
}