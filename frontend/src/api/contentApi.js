// frontend/src/api/contentApi.js
import api from '@/lib/axios'

export const contentApi = {

  // ── Génération ────────────────────────────────────────────
  generate: (data) =>
    api.post('/content/generate', data),

  // ── Historique ────────────────────────────────────────────
  getAll: () =>
    api.get('/content'),

  getById: (id) =>
    api.get(`/content/${id}`),

  // ── Publication ───────────────────────────────────────────
  publish: (id, data) =>
    api.post(`/content/${id}/publish`, data),

  cancel: (id) =>
    api.post(`/content/${id}/cancel`),

  // ── Téléchargements ───────────────────────────────────────
  downloadImage: (id) =>
    api.get(`/content/${id}/download/image`, { responseType: 'blob' }),

  downloadVideo: (id) =>
    api.get(`/content/${id}/download/video`, { responseType: 'blob' }),
}