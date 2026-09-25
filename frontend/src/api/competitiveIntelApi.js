// frontend/src/api/competitiveIntelApi.js
// API Client — Agent Veille Concurrentielle
import api from '@/lib/axios'

export const competitiveIntelApi = {
  // ── Gestion concurrents ────────────────────────────────────
  getCompetitors  : (params) => api.get('/professional/agents/competitive-intel/competitors', { params }),
  addCompetitor   : (data)   => api.post('/professional/agents/competitive-intel/competitors', data),
  deleteCompetitor: (id)     => api.delete(`/professional/agents/competitive-intel/competitors/${id}`),

  // ── Analyse IA complète ────────────────────────────────────
  // NLTK + VADER + TextBlob + K-Means + DBSCAN + TF-IDF + Mistral 7B
  analyze         : (data)   => api.post('/professional/agents/competitive-intel/analyze', data, {
    timeout: 330000, // 5.5 min max
  }),

  // ── Collecte manuelle ──────────────────────────────────────
  collect         : ()       => api.post('/professional/agents/competitive-intel/collect'),

  // ── Rapports PDF (ci_reports) ──────────────────────────────
  getReports      : (params) => api.get('/professional/agents/competitive-intel/reports', { params }),
}