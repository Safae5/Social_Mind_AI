import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Key, ArrowLeft, AlertCircle } from 'lucide-react'
import AuthLayout from '@/components/layout/AuthLayout'
import { Button }  from '@/components/ui/Button'
import OtpInput    from '@/components/auth/OtpInput'
import { useVerifyTwoFactor } from '@/hooks/useTwoFactor'

export default function TwoFactorVerifyPage() {
  const [mode, setMode]       = useState('otp') // 'otp' | 'recovery'
  const [otp, setOtp]         = useState('')
  const [recovery, setRecovery] = useState('')
  const [otpError, setOtpError] = useState(false)

  const verifyMutation = useVerifyTwoFactor()

  const handleVerifyOtp = () => {
    if (otp.length !== 6) return

    verifyMutation.mutate(
      { otp },
      {
        onError: () => {
          setOtpError(true)
          setOtp('')
          setTimeout(() => setOtpError(false), 2000)
        },
      }
    )
  }

  const handleVerifyRecovery = () => {
    if (!recovery.trim()) return

    verifyMutation.mutate({ recovery_code: recovery.trim() })
  }

  return (
    <AuthLayout
      title="Vérification 2FA"
      subtitle="Entrez votre code d'authentification"
    >
      <div className="space-y-5">

        {/* Icône */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-violet-600" />
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Mode OTP ── */}
          {mode === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <p className="text-center text-sm text-gray-500">
                Ouvrez Google Authenticator et entrez votre code à 6 chiffres.
              </p>

              <OtpInput
                length={6}
                onComplete={(code) => setOtp(code)}
                error={otpError}
                disabled={verifyMutation.isPending}
              />

              {otpError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-sm text-red-500 justify-center"
                >
                  <AlertCircle className="h-4 w-4" />
                  Code incorrect. Réessayez.
                </motion.div>
              )}

              <Button
                size="lg"
                className="w-full"
                onClick={handleVerifyOtp}
                loading={verifyMutation.isPending}
                disabled={otp.length !== 6}
              >
                Vérifier
              </Button>

              <button
                type="button"
                onClick={() => setMode('recovery')}
                className="w-full text-sm text-gray-400 hover:text-violet-600 transition-colors"
              >
                <Key className="h-3.5 w-3.5 inline mr-1" />
                Utiliser un code de récupération
              </button>
            </motion.div>
          )}

          {/* ── Mode code de récupération ── */}
          {mode === 'recovery' && (
            <motion.div
              key="recovery"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <p className="text-center text-sm text-gray-500">
                Entrez l'un de vos codes de récupération.
                Chaque code ne peut être utilisé qu'une seule fois.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                Format : XXXX-XXXX-XXXX (tirets inclus ou non)
              </div>

              <input
                type="text"
                value={recovery}
                onChange={(e) => setRecovery(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                className="w-full px-4 py-3 text-center font-mono text-base border-2 border-gray-300
                           rounded-lg focus:outline-none focus:border-violet-500 uppercase tracking-widest"
                disabled={verifyMutation.isPending}
              />

              <Button
                size="lg"
                className="w-full"
                onClick={handleVerifyRecovery}
                loading={verifyMutation.isPending}
                disabled={!recovery.trim()}
              >
                Utiliser ce code
              </Button>

              <button
                type="button"
                onClick={() => setMode('otp')}
                className="flex items-center justify-center gap-1 w-full text-sm text-gray-400 hover:text-violet-600"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour au code OTP
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </AuthLayout>
  )
}