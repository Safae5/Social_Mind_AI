// frontend/src/api/admin/usersApi.js
import api from '@/lib/axios'

export const adminUsersApi = {
  list          : (params)      => api.get('/admin/users', { params }),
  get            : (id)          => api.get(`/admin/users/${id}`),
  changeRole     : (id, role)    => api.patch(`/admin/users/${id}/role`, { role }),
  suspend        : (id, reason)  => api.post(`/admin/users/${id}/suspend`, { reason }),
  unsuspend      : (id)          => api.post(`/admin/users/${id}/unsuspend`),
  ban            : (id, reason)  => api.post(`/admin/users/${id}/ban`, { reason, confirm: true }),
  triggerPasswordReset: (id)     => api.post(`/admin/users/${id}/password-reset`),
  requestDeletion: (id)          => api.delete(`/admin/users/${id}`),
}
