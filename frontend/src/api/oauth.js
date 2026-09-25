import api from '@/lib/axios'

export const oauthApi = {

  // ── Redirige vers Google ──────────────────────────────────────
  // On utilise window.location.href car c'est une redirection HTTP
  redirectToGoogle: () => {
    window.location.href = 'http://localhost:8000/api/auth/google'
  },

  // ── Redirige vers Facebook ────────────────────────────────────
  redirectToFacebook: () => {
    window.location.href = 'http://localhost:8000/api/auth/facebook'
  },

  // ── Comptes liés ─────────────────────────────────────────────
  getLinkedAccounts: () =>
    api.get('/auth/social-accounts'),

  // ── Lier un compte ────────────────────────────────────────────
  linkAccount: (provider, token) =>
    api.post(`/auth/link/${provider}`, { token }),

  // ── Délier un compte ──────────────────────────────────────────
  unlinkAccount: (provider) =>
    api.delete(`/auth/unlink/${provider}`),
}