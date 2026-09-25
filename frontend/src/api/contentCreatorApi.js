// frontend/src/api/contentCreatorApi.js
// API Client — Agent Créateur de Contenu IA
import api from '@/lib/axios'

export const contentCreatorApi = {
  // ── Génération ─────────────────────────────────────────────
  // Mistral 7B + SDXL-Turbo + Mistral 7B + ReportLab
  generate     : (data)  => api.post('/professional/agents/content-creator/generate', data, {
    timeout: 660000, // 11 min
  }),

  // ── Historique ─────────────────────────────────────────────
  getAll       : (params) => api.get('/professional/agents/content-creator', { params }),

  // ── Détail ─────────────────────────────────────────────────
  getOne       : (id)    => api.get(`/professional/agents/content-creator/${id}`),

  // ── Téléchargements ────────────────────────────────────────
  downloadImage: (id)    => api.get(`/professional/agents/content-creator/${id}/download/image`, {
    responseType: 'blob',
  }),
  downloadPdf  : (id)    => api.get(`/professional/agents/content-creator/${id}/download/pdf`, {
    responseType: 'blob',
  }),

  // ── Workflow d'approbation ──────────────────────────────────
  approve      : (id)    => api.post(`/professional/agents/content-creator/${id}/approve`),
  reject       : (id, reason) => api.post(`/professional/agents/content-creator/${id}/reject`, { reason }),
  publish      : (id, smAccountId) => api.post(`/professional/agents/content-creator/${id}/publish`, {
    sm_account_id: smAccountId,
  }),

  // ── Suppression ────────────────────────────────────────────
  destroy      : (id)    => api.delete(`/professional/agents/content-creator/${id}`),
}