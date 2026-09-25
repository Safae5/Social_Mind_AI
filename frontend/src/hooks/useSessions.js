import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/axios'

// ── API Sessions ──────────────────────────────────────────────
const sessionsApi = {
  getAll:       () => api.get('/auth/sessions'),
  revoke:       (id) => api.delete(`/auth/sessions/${id}`),
  revokeOthers: () => api.delete('/auth/sessions/others'),
  tokenInfo:    () => api.get('/auth/token/info'),
}

// ── Hook : Toutes les sessions ────────────────────────────────
export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const response = await sessionsApi.getAll()
      console.log('Sessions reçues:', response.data) // debug
      return response.data.data
    },
    staleTime:       1000 * 30,
    refetchInterval: 1000 * 60,
  })
}

// ── Hook : Révoquer une session ───────────────────────────────
export function useRevokeSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId) => sessionsApi.revoke(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Session déconnectée avec succès.')
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || 'Impossible de déconnecter cette session.'
      )
    },
  })
}

// ── Hook : Révoquer toutes les autres sessions ────────────────
export function useRevokeOtherSessions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => sessionsApi.revokeOthers(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Toutes les autres sessions ont été déconnectées.')
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || 'Erreur lors de la révocation.'
      )
    },
  })
}

// ── Hook : Info token ─────────────────────────────────────────
export function useTokenInfo() {
  return useQuery({
    queryKey: ['token-info'],
    queryFn: async () => {
      try {
        const response = await sessionsApi.tokenInfo()
        return response.data.data
      } catch {
        return null
      }
    },
    staleTime:       1000 * 30,
    refetchInterval: 1000 * 60,
  })
}