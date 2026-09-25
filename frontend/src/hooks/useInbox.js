// frontend/src/hooks/useInbox.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inboxApi } from '@/api/inboxApi'
import { toast } from 'sonner'

export function useInboxMessages(params = {}) {
  return useQuery({
    queryKey: ['inbox-messages', params],
    queryFn : () => inboxApi.getMessages(params).then(r => r.data),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 2, // Polling 2 min
  })
}

export function useRefreshInbox() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => inboxApi.refresh(),
    onSuccess: () => {
      toast.success('🔄 Rechargement lancé !')
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['inbox-messages'] }), 3000)
    },
  })
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => inboxApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inbox-messages'] }),
  })
}

export function useApproveReply() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, replyText }) => inboxApi.approve(id, replyText),
    onSuccess: () => {
      toast.success('✅ Réponse publiée !')
      queryClient.invalidateQueries({ queryKey: ['inbox-messages'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur publication.'),
  })
}

export function useRejectReply() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => inboxApi.reject(id),
    onSuccess: () => {
      toast.success('Réponse rejetée.')
      queryClient.invalidateQueries({ queryKey: ['inbox-messages'] })
    },
  })
}

export function useFlagMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => inboxApi.flag(id),
    onSuccess: () => {
      toast.success('🚩 Signalé pour revue.')
      queryClient.invalidateQueries({ queryKey: ['inbox-messages'] })
    },
  })
}

export function useRegenerateReply() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => inboxApi.regenerate(id),
    onSuccess: () => {
      toast.success('✨ Nouvelle réponse générée !')
      queryClient.invalidateQueries({ queryKey: ['inbox-messages'] })
    },
    onError: () => toast.error('Erreur lors de la régénération.'),
  })
}

export function useInboxConfig(accountId) {
  return useQuery({
    queryKey: ['inbox-config', accountId],
    queryFn : () => accountId
      ? inboxApi.getConfig(accountId).then(r => r.data.data.config)
      : null,
    enabled: !!accountId,
  })
}

export function useUpdateConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ accountId, data }) => inboxApi.updateConfig(accountId, data),
    onSuccess: (_, { accountId }) => {
      toast.success('✅ Configuration sauvegardée !')
      queryClient.invalidateQueries({ queryKey: ['inbox-config', accountId] })
    },
  })
}