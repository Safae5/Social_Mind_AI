import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react'
import { useCheckoutSuccess } from '@/hooks/useSubscription'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'

export default function SuccessPage() {
  const navigate   = useNavigate()
  const { user }   = useAuth()
  const { data, isLoading } = useCheckoutSuccess()

  // Redirige vers dashboard après 5 secondes
  useEffect(() => {
    if (data) {
      const timer = setTimeout(() => {
        navigate(user?.role === 'business' ? '/dashboard/professional' : '/dashboard')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [data])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Confirmation du paiement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-violet-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 max-w-md w-full text-center"
      >
        {/* Animation succès */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="h-10 w-10 text-green-600" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Paiement réussi ! 🎉
          </h1>
          {data?.plan_name && (
            <p className="text-gray-600 mb-1">
              Le plan <strong>{data.plan_name}</strong> est maintenant actif.
            </p>
          )}
          <p className="text-sm text-gray-400 mb-8">
            Redirection automatique dans 5 secondes...
          </p>

          {/* Confettis animés */}
          <div className="flex justify-center gap-2 mb-6">
            {['✨', '🚀', '🎯', '⚡', '🤖'].map((emoji, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="text-2xl"
              >
                {emoji}
              </motion.span>
            ))}
          </div>

          <Link to={user?.role === 'business' ? '/dashboard/professional' : '/dashboard'}>
            <Button size="lg" className="w-full">
              <Sparkles className="h-4 w-4" />
              Aller à mon tableau de bord
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}