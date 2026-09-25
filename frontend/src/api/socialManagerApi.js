// frontend/src/api/socialManagerApi.js
// API Client — Agent Gestionnaire de Réseaux Sociaux
// Cohérent avec professionalApi.js du dashboard professionnel
import api from '@/lib/axios'

export const socialManagerApi = {
  // ── Comptes sociaux ────────────────────────────────────────
  getAccounts     : ()           => api.get('/professional/agents/social-manager/accounts'),
  getConnectableAccounts: ()     => api.get('/professional/agents/social-manager/connectable-accounts'),
  connect         : (data)       => api.post('/professional/agents/social-manager/connect', data),

  // ── OAuth Meta (même endpoint que le Planificateur standard —
  // /oauth/meta/redirect n'est pas restreint par rôle) ──────────
  getMetaAuthUrl  : ()            => api.post('/oauth/meta/redirect'),

  // ── Créneaux optimaux Prophet ──────────────────────────────
  getOptimalSlots : (accountId)  => api.get(`/professional/agents/social-manager/optimal-slots/${accountId}`),

  // ── Inbox commentaires ─────────────────────────────────────
  getInbox        : (params)     => api.get('/professional/agents/social-manager/inbox', { params }),
  generateReply   : (commentId)  => api.post(`/professional/agents/social-manager/comments/${commentId}/generate-reply`),
  approveReply    : (commentId, replyText) =>
    api.post(`/professional/agents/social-manager/comments/${commentId}/approve`, { reply_text: replyText }),

  // ── File d'attente ─────────────────────────────────────────
  getQueue        : ()           => api.get('/professional/agents/social-manager/queue'),
  addToQueue      : (data)       => api.post('/professional/agents/social-manager/queue', data),
  removeFromQueue : (id)         => api.delete(`/professional/agents/social-manager/queue/${id}`),

  // ── Métriques ──────────────────────────────────────────────
  getMetrics      : (accountId)  => api.get(`/professional/agents/social-manager/metrics/${accountId}`),
}