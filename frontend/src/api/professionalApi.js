// frontend/src/api/professionalApi.js
import api from '@/lib/axios'

export const professionalApi = {
  // ── Onboarding ────────────────────────────────────────────
  getOnboardingStatus : ()            => api.get('/professional/onboarding'),
  saveOnboardingStep  : (step, data)  => api.post(`/professional/onboarding/step/${step}`, data),
  completeOnboarding  : ()            => api.post('/professional/onboarding/complete'),
  updateProfile       : (data)        => api.put('/professional/profile', data),

  // ── Clients ───────────────────────────────────────────────
  getClients    : (params)   => api.get('/professional/clients', { params }),
  getClient     : (id)       => api.get(`/professional/clients/${id}`),
  createClient  : (data)     => api.post('/professional/clients', data),
  updateClient  : (id, data) => api.put(`/professional/clients/${id}`, data),
  deleteClient  : (id)       => api.delete(`/professional/clients/${id}`),
  getWorkspace  : (id)       => api.get(`/professional/clients/${id}/workspace`),

  // ── Agents ────────────────────────────────────────────────
  getAgents      : (params)  => api.get('/professional/agents', { params }),
  getActivity    : (params)  => api.get('/professional/agents/activity', { params }),
  logActivity    : (data)    => api.post('/professional/agents/log', data),

  // ── Analytics ─────────────────────────────────────────────
  getAnalytics  : (params)   => api.get('/professional/analytics', { params }),

  // ── Facturation ───────────────────────────────────────────
  getInvoices       : (params)       => api.get('/professional/invoices', { params }),
  createInvoice     : (data)         => api.post('/professional/invoices', data),
  updateInvoiceStatus: (id, status)  => api.put(`/professional/invoices/${id}/status`, { status }),

  // ── Marketplace ───────────────────────────────────────────
  getMarketplaceProfile  : ()     => api.get('/professional/marketplace/profile'),
  saveMarketplaceProfile : (data) => api.post('/professional/marketplace/profile', data),
  addPortfolioItem       : (data) => api.post('/professional/marketplace/portfolio', data),
  addTestimonial         : (data) => api.post('/professional/marketplace/testimonial', data),
  addCaseStudy           : (data) => api.post('/professional/marketplace/case-study', data),
}