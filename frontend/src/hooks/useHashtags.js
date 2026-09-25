// frontend/src/hooks/useHashtags.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hashtagApi } from '@/api/hashtagApi'
import { toast } from 'sonner'

export function useHashtagGenerate() {
  return useMutation({
    mutationFn: (data) => hashtagApi.generate(data),
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Erreur lors de la génération.')
    },
  })
}

export function useHashtagTrends() {
  return useMutation({
    mutationFn: (data) => hashtagApi.trends(data),
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Erreur tendances.')
    },
  })
}

export function useHashtagHistory() {
  return useQuery({
    queryKey: ['hashtag-history'],
    queryFn : () => hashtagApi.getHistory().then(r => r.data.data.history),
    staleTime: 1000 * 60 * 5,
  })
}

export function useFavorites() {
  return useQuery({
    queryKey: ['hashtag-favorites'],
    queryFn : () => hashtagApi.getFavorites().then(r => r.data.data.favorites),
    staleTime: 1000 * 60 * 5,
  })
}

export function useSaveFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => hashtagApi.saveFavorite(data),
    onSuccess: () => {
      toast.success('⭐ Ensemble sauvegardé !')
      queryClient.invalidateQueries({ queryKey: ['hashtag-favorites'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Erreur sauvegarde.')
    },
  })
}

export function useDeleteFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => hashtagApi.deleteFavorite(id),
    onSuccess: () => {
      toast.success('Ensemble supprimé.')
      queryClient.invalidateQueries({ queryKey: ['hashtag-favorites'] })
    },
  })
}

export function useUseFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => hashtagApi.useFavorite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hashtag-favorites'] })
    },
  })
}