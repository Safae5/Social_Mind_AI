import axios from 'axios'
import api from '@/lib/axios'

// ── Client public — pas de redirect automatique ───────────────
const publicApi = axios.create({
  baseURL:         '/api',
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
})

export const subscriptionApi = {

  // ── Plans ──────────────────────────────────────────────────────
  getPlans: () =>
    publicApi.get('/plans'),

  // ── Abonnement courant ────────────────────────────────────────
  getCurrent: () =>
    api.get('/subscription'),

  // ── Checkout Stripe ───────────────────────────────────────────
  checkout: (planSlug, billingCycle) =>
    api.post('/subscription/checkout', { plan_slug: planSlug, billing_cycle: billingCycle }),

  // ── Portail Stripe ────────────────────────────────────────────
  openPortal: () =>
    api.post('/subscription/portal'),

  // ── Annulation ────────────────────────────────────────────────
  cancel: (reason, feedback) =>
    api.post('/subscription/cancel', { reason, feedback }),

  // ── Factures ──────────────────────────────────────────────────
  getInvoices: () =>
    api.get('/subscription/invoices'),

  // ── Succès après checkout ─────────────────────────────────────
  confirmSuccess: (sessionId) =>
    api.get('/subscription/success', { params: { session_id: sessionId } }),
}