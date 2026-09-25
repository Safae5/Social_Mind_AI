// frontend/src/hooks/useContent.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contentApi } from '@/api/contentApi'
import { toast } from 'sonner'

export function useGeneratedContents() {
  return useQuery({
    queryKey: ['generated-contents'],
    queryFn : () => contentApi.getAll().then(r => r.data.data.contents),
    staleTime: 1000 * 60 * 5,
  })
}

export function useGenerateContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => contentApi.generate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-contents'] })
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Erreur lors de la génération.'
      toast.error(msg)
    },
  })
}

export function usePublishContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => contentApi.publish(id, data),
    onSuccess: () => {
      toast.success('✅ Publié avec succès !')
      queryClient.invalidateQueries({ queryKey: ['generated-contents'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Échec de la publication.')
    },
  })
}

export function useDownload() {
  return {
    downloadImage: async (id, platform) => {
      try {
        const response = await contentApi.downloadImage(id)
        const blob     = new Blob([response.data], { type: 'image/png' })
        const url      = window.URL.createObjectURL(blob)
        const link     = document.createElement('a')
        link.href      = url
        link.download  = `social_mind_image_${platform}_${id}.png`
        link.click()
        window.URL.revokeObjectURL(url)
        toast.success('Image téléchargée !')
      } catch {
        toast.error('Erreur téléchargement image.')
      }
    },
    downloadVideo: async (id, platform) => {
      try {
        const response = await contentApi.downloadVideo(id)
        const blob     = new Blob([response.data], { type: 'video/mp4' })
        const url      = window.URL.createObjectURL(blob)
        const link     = document.createElement('a')
        link.href      = url
        link.download  = `social_mind_video_${platform}_${id}.mp4`
        link.click()
        window.URL.revokeObjectURL(url)
        toast.success('Vidéo téléchargée !')
      } catch {
        toast.error('Erreur téléchargement vidéo.')
      }
    },
  }
}