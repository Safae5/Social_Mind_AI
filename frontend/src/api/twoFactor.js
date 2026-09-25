import api from '@/lib/axios'

export const twoFactorApi = {

  // ── Statut 2FA ────────────────────────────────────────────────
  getStatus: () =>
    api.get('/2fa/status'),

  // ── Setup : génère QR Code ────────────────────────────────────
  setup: () =>
    api.get('/2fa/setup'),

  // ── Confirme avec premier OTP ─────────────────────────────────
  confirm: (otp) =>
    api.post('/2fa/confirm', { otp }),

  // ── Désactive la 2FA ──────────────────────────────────────────
  disable: (otp) =>
    api.delete('/2fa/disable', { data: { otp } }),

  // ── Vérifie OTP après login ───────────────────────────────────
  verify: (data) =>
    api.post('/2fa/verify', data),

  // ── Codes de récupération ─────────────────────────────────────
  getRecoveryCodes: () =>
    api.get('/2fa/recovery-codes'),

  regenerateRecoveryCodes: (otp) =>
    api.post('/2fa/recovery-codes/regenerate', { otp }),
}