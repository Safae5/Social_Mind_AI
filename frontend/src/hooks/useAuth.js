import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { useAuth } from '@/context/AuthContext'

// ── Affiche les erreurs de validation de façon lisible ────────
function handleValidationError(error) {
  const data   = error.response?.data
  const errors = data?.errors

  if (errors && typeof errors === 'object') {
    // Affiche chaque erreur de validation
    Object.entries(errors).forEach(([field, messages]) => {
      const label = {
        first_name:            'Prénom',
        last_name:             'Nom',
        email:                 'E-mail',
        password:              'Mot de passe',
        password_confirmation: 'Confirmation',
        role:                  'Type de compte',
        phone:                 'Téléphone',
      }[field] || field

      const message = Array.isArray(messages) ? messages[0] : messages
      toast.error(`${label} : ${message}`)
    })
    return
  }

  toast.error(data?.message || 'Une erreur est survenue.')
}

// ── Hook : Inscription ────────────────────────────────────────
export function useRegister() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data) => {
      console.log('📤 Envoi inscription:', data)
      return authApi.register(data)
    },
    onSuccess: (response) => {
      console.log('✅ Inscription réussie:', response.data)
      const email = response.data.data?.user?.email || ''
      toast.success('Compte créé ! Vérifiez votre e-mail.')
      navigate('/verify-email?email=' + encodeURIComponent(email))
    },
    onError: (error) => {
      console.error('❌ Erreur inscription:', error.response?.data)
      handleValidationError(error)
    },
  })
}

// ── Hook : Connexion ──────────────────────────────────────────
export function useLogin() {
  const { login }   = useAuth()
  const navigate    = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => authApi.login(data),
    onSuccess: (response) => {
      const { user, access_token, refresh_token } = response.data.data
      login(user, access_token, refresh_token)
      queryClient.setQueryData(['user'], user)
      toast.success(`Bienvenue ${user.first_name} !`)

      if (user.role === 'admin') {
        navigate(user.two_factor_enabled ? '/2fa-verify' : '/2fa-setup')
        return
      }

      const path = user.role === 'admin'    ? '/admin'
                 : user.role === 'business' ? '/dashboard/professional'
                 : '/dashboard'
      navigate(path)
    },
    onError: (error) => {
      handleValidationError(error)
    },
  })
}

// ── Hook : Déconnexion ────────────────────────────────────────
export function useLogout() {
  const { logout }  = useAuth()
  const navigate    = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      logout()
      queryClient.clear()
      navigate('/login')
      toast.success('Déconnecté avec succès.')
    },
    onError: () => {
      logout()
      navigate('/login')
    },
  })
}

// ── Hook : Vérification email ─────────────────────────────────
export function useVerifyEmail() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: ({ token, email }) => authApi.verifyEmail(token, email),
    onSuccess: () => {
      toast.success('E-mail vérifié ! Vous pouvez vous connecter.')
      navigate('/login')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Lien invalide ou expiré.')
    },
  })
}

// ── Hook : Renvoi vérification ────────────────────────────────
export function useResendVerification() {
  return useMutation({
    mutationFn: (email) => authApi.resendVerification(email),
    onSuccess: () => toast.success('E-mail de vérification renvoyé !'),
    onError: (error) => toast.error(
      error.response?.data?.message || 'Erreur lors de l\'envoi.'
    ),
  })
}

// ── Hook : Mot de passe oublié ────────────────────────────────
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email) => authApi.forgotPassword(email),
    onSuccess: () => toast.success('Lien envoyé à votre e-mail.'),
    onError: (error) => toast.error(
      error.response?.data?.message || 'Erreur lors de l\'envoi.'
    ),
  })
}

// ── Hook : Réinitialisation mot de passe ─────────────────────
export function useResetPassword() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data) => authApi.resetPassword(data),
    onSuccess: () => {
      toast.success('Mot de passe réinitialisé ! Connectez-vous.')
      navigate('/login')
    },
    onError: (error) => toast.error(
      error.response?.data?.message || 'Lien invalide ou expiré.'
    ),
  })
}

// ── Hook : Utilisateur courant ────────────────────────────────
export function useCurrentUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn:  () => authApi.me().then(r => r.data.data.user),
    staleTime: 1000 * 60 * 5,
  })
}