import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Smartphone, CheckCircle,
  Copy, RefreshCw, Eye, EyeOff,
  AlertTriangle, Download, Key
} from 'lucide-react'
import { toast } from 'sonner'
import { twoFactorApi } from '@/api/twoFactor'
import { useConfirmTwoFactor, useDisableTwoFactor, useTwoFactorStatus } from '@/hooks/useTwoFactor'
import { Button }   from '@/components/ui/Button'
import { Input }    from '@/components/ui/Input'
import OtpInput     from '@/components/auth/OtpInput'

// ── Étapes du wizard 2FA ──────────────────────────────────────
const STEPS = {
  STATUS:   'status',
  SCAN:     'scan',
  VERIFY:   'verify',
  SUCCESS:  'success',
  DISABLE:  'disable',
}

export default function TwoFactorSetupPage() {
  const [step, setStep]         = useState(STEPS.STATUS)
  const [setupData, setSetupData] = useState(null)
  const [otp, setOtp]           = useState('')
  const [otpError, setOtpError] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [showCodes, setShowCodes]   = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState([])
  const [disableOtp, setDisableOtp] = useState('')

  const { data: status, isLoading: statusLoading } = useTwoFactorStatus()
  const confirmMutation = useConfirmTwoFactor()
  const disableMutation = useDisableTwoFactor()

  // ── Lance le setup : récupère QR Code ─────────────────────────
  const handleStartSetup = async () => {
    setLoading(true)
    try {
      const response = await twoFactorApi.setup()
      setSetupData(response.data.data)
      setStep(STEPS.SCAN)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors du setup.')
    } finally {
      setLoading(false)
    }
  }

  // ── Confirme avec l'OTP ────────────────────────────────────────
  const handleConfirm = async () => {
    if (otp.length !== 6) return

    confirmMutation.mutate(otp, {
      onSuccess: (response) => {
        setRecoveryCodes(response.data.data.recovery_codes)
        setStep(STEPS.SUCCESS)
      },
      onError: () => {
        setOtpError(true)
        setOtp('')
        setTimeout(() => setOtpError(false), 2000)
      },
    })
  }

  // ── Copie dans le presse-papiers ──────────────────────────────
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copié !')
  }

  // ── Télécharge les codes de récupération ──────────────────────
  const downloadRecoveryCodes = () => {
    const content = [
      'Social Mind AI — Codes de récupération 2FA',
      '===========================================',
      'GARDEZ CES CODES EN SÉCURITÉ',
      '',
      ...recoveryCodes.map((code, i) => `${i + 1}. ${code}`),
      '',
      `Générés le : ${new Date().toLocaleDateString('fr-FR')}`,
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'social-mind-ai-recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Affichage selon le step ───────────────────────────────────

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-6">

      {/* En-tête */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
          <Shield className="h-6 w-6 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Authentification à deux facteurs
          </h1>
          <p className="text-sm text-gray-500">Sécurisez votre compte Admin</p>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── ÉTAPE 1 : Statut actuel ── */}
        {step === STEPS.STATUS && (
          <motion.div
            key="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Carte statut */}
            <div className={`
              p-5 rounded-xl border-2 flex items-center gap-4
              ${status?.two_factor_enabled
                ? 'border-green-200 bg-green-50'
                : 'border-orange-200 bg-orange-50'
              }
            `}>
              {status?.two_factor_enabled ? (
                <>
                  <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800">2FA activée</p>
                    <p className="text-sm text-green-600">
                      Activée le {new Date(status.confirmed_at).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-xs text-green-500 mt-1">
                      {status.recovery_codes_count} codes de récupération restants
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-8 w-8 text-orange-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-orange-800">2FA non activée</p>
                    <p className="text-sm text-orange-600">
                      Votre compte Admin n'est pas protégé par la 2FA.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            {!status?.two_factor_enabled ? (
              <Button
                size="lg"
                className="w-full"
                onClick={handleStartSetup}
                loading={loading}
              >
                <Smartphone className="h-4 w-4" />
                Activer Google Authenticator
              </Button>
            ) : (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowCodes(!showCodes)}
                >
                  <Key className="h-4 w-4" />
                  {showCodes ? 'Masquer' : 'Voir'} les codes de récupération
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => setStep(STEPS.DISABLE)}
                >
                  Désactiver la 2FA
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── ÉTAPE 2 : Scanner le QR Code ── */}
        {step === STEPS.SCAN && setupData && (
          <motion.div
            key="scan"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">
                Instructions
              </h3>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Installez Google Authenticator sur votre téléphone</li>
                <li>Ouvrez l'app → appuyez sur "+" → "Scanner un QR code"</li>
                <li>Scannez le QR code ci-dessous</li>
                <li>Entrez le code à 6 chiffres qui apparaît</li>
              </ol>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white border-2 border-gray-200 rounded-xl">
                <img
                  src={setupData.qr_code}
                  alt="QR Code 2FA"
                  className="w-48 h-48"
                />
              </div>

              {/* Saisie manuelle */}
              <div className="w-full">
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showSecret ? 'Masquer' : 'Saisie manuelle'}
                </button>

                {showSecret && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Clé secrète</p>
                        <p className="font-mono text-sm font-bold text-gray-900 tracking-wider">
                          {setupData.secret}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(setupData.secret)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-gray-400 grid grid-cols-2 gap-1">
                      <span>Compte : {setupData.manual_entry.account}</span>
                      <span>Période : {setupData.manual_entry.period}s</span>
                      <span>Algorithme : {setupData.manual_entry.algorithm}</span>
                      <span>Chiffres : {setupData.manual_entry.digits}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={() => setStep(STEPS.VERIFY)}
            >
              J'ai scanné le QR Code →
            </Button>
          </motion.div>
        )}

        {/* ── ÉTAPE 3 : Vérification OTP ── */}
        {step === STEPS.VERIFY && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-8 w-8 text-violet-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Entrez le code de vérification
              </h2>
              <p className="text-sm text-gray-500">
                Ouvrez Google Authenticator et entrez le code à 6 chiffres
              </p>
            </div>

            {/* OTP Input */}
            <OtpInput
              length={6}
              onComplete={(code) => setOtp(code)}
              error={otpError}
            />

            {otpError && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-sm text-red-500"
              >
                Code incorrect. Réessayez.
              </motion.p>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={handleConfirm}
              loading={confirmMutation.isPending}
              disabled={otp.length !== 6}
            >
              <CheckCircle className="h-4 w-4" />
              Activer la 2FA
            </Button>

            <button
              type="button"
              onClick={() => setStep(STEPS.SCAN)}
              className="w-full text-sm text-gray-400 hover:text-gray-600"
            >
              ← Retour au QR Code
            </button>
          </motion.div>
        )}

        {/* ── ÉTAPE 4 : Succès + Codes de récupération ── */}
        {step === STEPS.SUCCESS && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {/* Succès */}
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="h-9 w-9 text-green-600" />
              </motion.div>
              <h2 className="text-lg font-semibold text-gray-900">
                2FA activée avec succès !
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Sauvegardez vos codes de récupération maintenant.
              </p>
            </div>

            {/* Avertissement codes de récupération */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm font-medium text-amber-800">
                  Sauvegardez ces codes de récupération !
                </p>
              </div>
              <p className="text-xs text-amber-700 mb-3">
                Si vous perdez votre téléphone, ces codes sont le seul moyen
                de récupérer l'accès à votre compte. Chaque code ne peut être utilisé qu'une seule fois.
              </p>

              {/* Codes */}
              <div className="bg-white rounded-lg border border-amber-200 p-3 grid grid-cols-2 gap-2">
                {recoveryCodes.map((code, i) => (
                  <div
                    key={i}
                    className="font-mono text-sm text-gray-800 bg-gray-50 px-2 py-1 rounded text-center"
                  >
                    {code}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-amber-300 text-amber-700"
                  onClick={() => copyToClipboard(recoveryCodes.join('\n'))}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-amber-300 text-amber-700"
                  onClick={downloadRecoveryCodes}
                >
                  <Download className="h-3.5 w-3.5" />
                  Télécharger
                </Button>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={() => setStep(STEPS.STATUS)}
            >
              Terminer la configuration
            </Button>
          </motion.div>
        )}

        {/* ── DÉSACTIVATION 2FA ── */}
        {step === STEPS.DISABLE && (
          <motion.div
            key="disable"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-5"
          >
            <div className="text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="h-7 w-7 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Désactiver la 2FA ?
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Entrez votre code OTP actuel pour confirmer.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700">
                ⚠️ Désactiver la 2FA rendra votre compte Admin moins sécurisé.
              </p>
            </div>

            <OtpInput
              length={6}
              onComplete={(code) => setDisableOtp(code)}
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(STEPS.STATUS)}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => {
                  disableMutation.mutate(disableOtp, {
                    onSuccess: () => setStep(STEPS.STATUS),
                  })
                }}
                loading={disableMutation.isPending}
                disabled={disableOtp.length !== 6}
              >
                Désactiver
              </Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}