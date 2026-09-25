// frontend/src/api/hashtagApi.js
import api from '@/lib/axios'

export const hashtagApi = {

  // ── Génération ────────────────────────────────────────────
  generate: (data) =>
    api.post('/hashtags/generate', data),

  trends: (data) =>
    api.post('/hashtags/trends', data),

  // ── Historique ────────────────────────────────────────────
  getHistory: () =>
    api.get('/hashtags/history'),

  // ── Favoris ───────────────────────────────────────────────
  getFavorites: () =>
    api.get('/hashtags/favorites'),

  saveFavorite: (data) =>
    api.post('/hashtags/favorites', data),

  updateFavorite: (id, data) =>
    api.put(`/hashtags/favorites/${id}`, data),

  deleteFavorite: (id) =>
    api.delete(`/hashtags/favorites/${id}`),

  useFavorite: (id) =>
    api.post(`/hashtags/favorites/${id}/use`),
}