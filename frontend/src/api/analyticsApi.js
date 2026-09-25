// frontend/src/api/analyticsApi.js
// API Client — Agent Analytics IA
import api from '@/lib/axios'

export const analyticsApi = {
  // ── Dashboard principal ────────────────────────────────────
  // Pipeline : Meta Graph API → Prophet → XGBoost → RF → Graphiques → PDF
  getDashboard : (params) => api.get('/professional/agents/analytics/dashboard', {
    params,
    timeout: 330000, // 5.5 min (Prophet + XGBoost + RF + 7 graphiques)
  }),

  // ── Collecte manuelle ──────────────────────────────────────
  collect      : ()       => api.post('/professional/agents/analytics/collect'),

  // ── Prédiction XGBoost ─────────────────────────────────────
  predict      : (data)   => api.post('/professional/agents/analytics/predict', data),

  // ── Rapports PDF (an_reports) ──────────────────────────────
  getReports   : ()       => api.get('/professional/agents/analytics/reports'),

  downloadReport: (id, label) => api.get(`/professional/agents/analytics/reports/${id}/download`, {
    responseType: 'blob',
  }),
}