// frontend/src/hooks/useScheduler.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schedulerApi } from '@/api/schedulerApi'
import { toast } from 'sonner'

export function useSocialAccounts() {
  return useQuery({
    queryKey: ['social-accounts'],
    queryFn : () => schedulerApi.getAccounts().then(r => r.data.data),
    staleTime: 1000 * 60 * 5,
  })
}

export function useOptimalSlots() {
  return useQuery({
    queryKey: ['optimal-slots'],
    queryFn : () => schedulerApi.getOptimalSlots().then(r => r.data.data),
    staleTime: 1000 * 60 * 60, // 1 heure
  })
}

export function useCalendar(days = 30) {
  return useQuery({
    queryKey: ['calendar', days],
    queryFn : () => schedulerApi.getCalendar(days).then(r => r.data.data),
    staleTime: 1000 * 60 * 5,
  })
}

export function useContentQueue(accountId = null) {
  return useQuery({
    queryKey: ['content-queue', accountId],
    queryFn : () => schedulerApi.getQueue(accountId).then(r => r.data.data),
    staleTime: 1000 * 60 * 2,
  })
}

export function useUpcomingPosts() {
  return useQuery({
    queryKey: ['upcoming-posts'],
    queryFn : () => schedulerApi.getUpcoming().then(r => r.data.data.posts),
    staleTime: 1000 * 60 * 2,
  })
}

export function useAnalyze() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ accountId, async = true }) =>
      schedulerApi.analyze(accountId, async),
    onSuccess: (_, variables) => {
      toast.success(variables.async
        ? '🔄 Analyse en cours... Les créneaux seront disponibles dans quelques minutes.'
        : '✅ Analyse terminée !'
      )
      queryClient.invalidateQueries({ queryKey: ['optimal-slots'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur lors de l\'analyse.'),
  })
}

export function useAddToQueue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => schedulerApi.addToQueue(data),
    onSuccess: () => {
      toast.success('📋 Contenu ajouté à la file d\'attente !')
      queryClient.invalidateQueries({ queryKey: ['content-queue'] })
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur.'),
  })
}

export function useRemoveFromQueue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (itemId) => schedulerApi.removeFromQueue(itemId),
    onSuccess: () => {
      toast.success('Supprimé de la file.')
      queryClient.invalidateQueries({ queryKey: ['content-queue'] })
    },
  })
}

export function useMetaOAuth() {
  return useMutation({
    mutationFn: () => schedulerApi.getMetaAuthUrl(),
    onSuccess: (response) => {
      // MetaOAuthController::redirect() renvoie { success, auth_url, state }
      // à plat — pas de clé `data` imbriquée.
      const { auth_url } = response.data
      window.location.href = auth_url
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur OAuth Meta.'),
  })
}

export function useTikTokOAuth() {
  return useMutation({
    mutationFn: () => schedulerApi.getTikTokAuthUrl(),
    onSuccess: (response) => {
      // Même forme que Meta — TikTokOAuthController::redirect() renvoie
      // { success, auth_url, state } à plat.
      const { auth_url } = response.data
      window.location.href = auth_url
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur OAuth TikTok.'),
  })
}

export function useInstagramDirectOAuth() {
  return useMutation({
    mutationFn: () => schedulerApi.getInstagramDirectAuthUrl(),
    onSuccess: (response) => {
      // Même forme que Meta/TikTok — InstagramDirectOAuthController::redirect()
      // renvoie { success, auth_url, state } à plat.
      const { auth_url } = response.data
      window.location.href = auth_url
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur OAuth Instagram.'),
  })
}

export function useDisconnectAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    // is_instagram_direct distingue les deux flux Instagram possibles —
    // /platform seul ne suffit pas, voir SocialAccountResource.
    mutationFn: ({ platform, id, isInstagramDirect }) =>
      platform === 'tiktok'
        ? schedulerApi.disconnectTikTok(id)
        : isInstagramDirect
          ? schedulerApi.disconnectInstagramDirect(id)
          : schedulerApi.disconnectMeta(id),
    onSuccess: () => {
      toast.success('Compte déconnecté.')
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur déconnexion.'),
  })
}

export function useCancelPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId) => schedulerApi.cancelPost(postId),
    onSuccess: () => {
      toast.success('Publication annulée.')
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      queryClient.invalidateQueries({ queryKey: ['upcoming-posts'] })
    },
  })
}