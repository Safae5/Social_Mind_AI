import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { twoFactorApi } from '@/api/twoFactor'
import { useAuth } from '@/context/AuthContext'

// ── Statut 2FA ────────────────────────────────────────────────
export function useTwoFactorStatus() {
  return useQuery({
    queryKey: ['2fa-status'],
    queryFn:  () => twoFactorApi.getStatus().then(r => r.data.data),
    staleTime: 1000 * 60 * 5,
  })
}

// ── Setup : récupère le QR Code ───────────────────────────────
export function useTwoFactorSetup() {
  return useQuery({
    queryKey: ['2fa-setup'],
    queryFn:  () => twoFactorApi.setup().then(r => r.data.data),
    staleTime: Infinity,
    enabled:   false, // déclenché manuellement
  })
}

// ── Confirme la 2FA avec le premier OTP ──────────────────────
export function useConfirmTwoFactor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (otp) => twoFactorApi.confirm(otp),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
      toast.success('2FA activée avec succès !')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Code OTP invalide.')
    },
  })
}

// ── Désactive la 2FA ──────────────────────────────────────────
export function useDisableTwoFactor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (otp) => twoFactorApi.disable(otp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
      toast.success('2FA désactivée.')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Code OTP invalide.')
    },
  })
}

// ── Vérifie OTP après login ───────────────────────────────────
export function useVerifyTwoFactor() {
  const navigate       = useNavigate()
  const { updateUser } = useAuth()

  return useMutation({
    mutationFn: (data) => twoFactorApi.verify(data),
    onSuccess: (response) => {
      const { two_factor_session_token, user } = response.data.data

      // Stocke le token de session 2FA
      localStorage.setItem('2fa_session_token', two_factor_session_token)

      // Met à jour l'intercepteur Axios pour envoyer le header
      updateUser(user)
      toast.success('Identité vérifiée ! Bienvenue.')
      navigate('/admin')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Code invalide.')
    },
  })
}

// ── Régénère les codes de récupération ───────────────────────
export function useRegenerateRecoveryCodes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (otp) => twoFactorApi.regenerateRecoveryCodes(otp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recovery-codes'] })
      toast.success('Nouveaux codes générés. Sauvegardez-les !')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Code OTP invalide.')
    },
  })
}