import api from '@/lib/axios'

export const sessionsApi = {

  // ── Récupère toutes les sessions actives ──────────────────────
  getAll: () =>
    api.get('/auth/sessions'),

  // ── Révoque une session spécifique ────────────────────────────
  revoke: (sessionId) =>
    api.delete(`/auth/sessions/${sessionId}`),

  // ── Révoque toutes les autres sessions ────────────────────────
  revokeOthers: () =>
    api.delete('/auth/sessions/others'),

  // ── Info sur le token actuel ──────────────────────────────────
  tokenInfo: () =>
    api.get('/auth/token/info'),
}