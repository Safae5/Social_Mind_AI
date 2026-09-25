// frontend/src/api/contentStrategyApi.js
// API Client — Agent Stratège de Contenu
import api from '@/lib/axios'

export const contentStrategyApi = {
  // ── Génération stratégie ───────────────────────────────────
  // Pipeline : Meta Graph + Playwright + BERTopic + LDA + TF-IDF + Mistral 7B
  generate : (data)  => api.post('/professional/agents/content-strategy/generate', data, {
    timeout: 660000, // 11 min max
  }),

  // ── Historique ─────────────────────────────────────────────
  getAll   : (params) => api.get('/professional/agents/content-strategy', { params }),

  // ── Détail complet ─────────────────────────────────────────
  getOne   : (id)    => api.get(`/professional/agents/content-strategy/${id}`),

  // ── Téléchargement PDF ReportLab ──────────────────────────
  downloadPdf: (id)  => api.get(`/professional/agents/content-strategy/${id}/pdf`, {
    responseType: 'blob',
  }),

  // ── Suppression ────────────────────────────────────────────
  destroy  : (id)    => api.delete(`/professional/agents/content-strategy/${id}`),
}