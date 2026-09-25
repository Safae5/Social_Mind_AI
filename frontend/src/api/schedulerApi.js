// frontend/src/api/schedulerApi.js
import api from '@/lib/axios'

export const schedulerApi = {

  // ── Comptes sociaux ─────────────────────────────────────────
  getAccounts: () =>
    api.get('/scheduler/accounts'),

  disconnectAccount: (platform) =>
    api.delete(`/scheduler/accounts/${platform}/disconnect`),

  // ── OAuth ────────────────────────────────────────────────────
  getMetaAuthUrl: () =>
    api.post('/oauth/meta/redirect'),

  getTikTokAuthUrl: () =>
    api.post('/oauth/tiktok/redirect'),

  getInstagramDirectAuthUrl: () =>
    api.post('/oauth/instagram-direct/redirect'),

  disconnectMeta: (accountId) =>
    api.delete(`/oauth/meta/disconnect/${accountId}`),

  disconnectTikTok: (accountId) =>
    api.delete(`/oauth/tiktok/disconnect/${accountId}`),

  disconnectInstagramDirect: (accountId) =>
    api.delete(`/oauth/instagram-direct/disconnect/${accountId}`),

  // ── Analyse IA ───────────────────────────────────────────────
  analyze: (accountId, async = true) =>
    api.post('/scheduler/analyze', { account_id: accountId, async }),

  // ── Créneaux optimaux ────────────────────────────────────────
  getOptimalSlots: () =>
    api.get('/scheduler/slots'),

  // ── Calendrier ───────────────────────────────────────────────
  getCalendar: (days = 30) =>
    api.get('/scheduler/calendar', { params: { days } }),

  // ── Publications planifiées ──────────────────────────────────
  getUpcoming: () =>
    api.get('/scheduler/upcoming'),

  cancelPost: (postId) =>
    api.post(`/scheduler/posts/${postId}/cancel`),

  // ── File d'attente ───────────────────────────────────────────
  getQueue: (accountId = null) =>
    api.get('/scheduler/queue', { params: accountId ? { account_id: accountId } : {} }),

  addToQueue: (data) =>
    api.post('/scheduler/queue', data),

  removeFromQueue: (itemId) =>
    api.delete(`/scheduler/queue/${itemId}`),
}