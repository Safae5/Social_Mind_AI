// frontend/src/api/adOptimizerApi.js
// API Client — Agent Optimisation Publicitaire
import api from '@/lib/axios'

export const adOptimizerApi = {
  // ── Comptes publicitaires ───────────────────────────────────
  getConnectableAccounts: () => api.get('/professional/agents/ad-optimizer/connectable-accounts'),
  connect                : (data) => api.post('/professional/agents/ad-optimizer/connect', data),

  // ── Pipeline complet ───────────────────────────────────────
  // XGBoost CTR + RF/GB Segments + SciPy linprog + Q-Learning + PDF
  analyze      : (data)   => api.post('/professional/agents/ad-optimizer/analyze', data, {
    timeout: 330000, // 5.5 min
  }),

  // ── Collecte manuelle ──────────────────────────────────────
  collect      : ()       => api.post('/professional/agents/ad-optimizer/collect'),

  // ── Prédiction CTR XGBoost ─────────────────────────────────
  predictCTR   : (data)   => api.post('/professional/agents/ad-optimizer/predict-ctr', data),

  // ── Enchère Q-Learning ─────────────────────────────────────
  bidRecommend : (data)   => api.post('/professional/agents/ad-optimizer/bid-recommendation', data),

  // ── Rapports PDF (ao_reports) ──────────────────────────────
  getReports   : ()       => api.get('/professional/agents/ad-optimizer/reports'),

  downloadReport: (id)    => api.get(`/professional/agents/ad-optimizer/reports/${id}/download`, {
    responseType: 'blob',
  }),
}