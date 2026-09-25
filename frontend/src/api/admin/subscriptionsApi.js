// frontend/src/api/admin/subscriptionsApi.js
import api from '@/lib/axios'

export const adminSubscriptionsApi = {
  list             : (params)   => api.get('/admin/subscriptions', { params }),
  metrics          : (params)   => api.get('/admin/subscriptions/metrics', { params }),
  changePlan       : (userId, planSlug, billingCycle) =>
    api.post(`/admin/users/${userId}/subscription/change-plan`, { plan_slug: planSlug, billing_cycle: billingCycle }),
  applyPromotion   : (userId, promotionCode) =>
    api.post(`/admin/users/${userId}/subscription/promotion`, { promotion_code: promotionCode }),
  refundInvoice    : (invoiceId, amount) =>
    api.post(`/admin/invoices/${invoiceId}/refund`, { amount: amount || undefined, confirm: true }),
}

export const adminPlansApi = {
  list    : ()          => api.get('/admin/plans'),
  create  : (data)      => api.post('/admin/plans', data),
  update  : (id, data)  => api.patch(`/admin/plans/${id}`, data),
  archive : (id)         => api.post(`/admin/plans/${id}/archive`),
}
