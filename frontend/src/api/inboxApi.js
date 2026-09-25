// frontend/src/api/inboxApi.js
import api from '@/lib/axios'

export const inboxApi = {
  // ── Inbox ─────────────────────────────────────────────────
  getMessages: (params = {}) =>
    api.get('/inbox', { params }),

  refresh: () =>
    api.post('/inbox/refresh'),

  markRead: (id) =>
    api.post(`/inbox/${id}/read`),

  // ── Réponses ──────────────────────────────────────────────
  approve: (id, replyText) =>
    api.post(`/inbox/${id}/approve`, { reply_text: replyText }),

  reject: (id) =>
    api.post(`/inbox/${id}/reject`),

  flag: (id) =>
    api.post(`/inbox/${id}/flag`),

  regenerate: (id) =>
    api.post(`/inbox/${id}/regenerate`),

  // ── Configuration ─────────────────────────────────────────
  getConfig: (accountId) =>
    api.get(`/inbox/config/${accountId}`),

  updateConfig: (accountId, data) =>
    api.put(`/inbox/config/${accountId}`, data),
}