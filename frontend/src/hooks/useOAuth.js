import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { oauthApi } from '@/api/oauth'

// ── Hook : Connexion Google ───────────────────────────────────
export function useGoogleLogin() {
  return useMutation({
    mutationFn: () => {
      oauthApi.redirectToGoogle()
      // Pas de retour — c'est une redirection
      return Promise.resolve()
    },
  })
}

// ── Hook : Connexion Facebook ─────────────────────────────────
export function useFacebookLogin() {
  return useMutation({
    mutationFn: () => {
      oauthApi.redirectToFacebook()
      return Promise.resolve()
    },
  })
}

// ── Hook : Comptes liés ───────────────────────────────────────
export function useLinkedAccounts() {
  return useQuery({
    queryKey: ['linked-accounts'],
    queryFn:  () => oauthApi.getLinkedAccounts().then(r => r.data.data.accounts),
    staleTime: 1000 * 60 * 5,
  })
}

// ── Hook : Délier un compte ───────────────────────────────────
export function useUnlinkAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (provider) => oauthApi.unlinkAccount(provider),
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ['linked-accounts'] })
      toast.success(`Compte ${capitalize(provider)} délié avec succès.`)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Impossible de délier le compte.')
    },
  })
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}