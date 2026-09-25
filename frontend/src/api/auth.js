import api from '@/lib/axios'

export const authApi = {

  register: (data) =>
    api.post('/auth/register', data),

  login: (data) =>
    api.post('/auth/login', data),

  logout: () =>
    api.post('/auth/logout'),

  logoutAll: () =>
    api.post('/auth/logout-all'),

  me: () =>
    api.get('/auth/me'),

  refresh: (refreshToken) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),

  verifyEmail: (token, email) =>
    api.post('/auth/email/verify', { token, email }),

  resendVerification: (email) =>
    api.post('/auth/email/resend', { email }),

  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (data) =>
    api.post('/auth/reset-password', data),

  getSessions:   () => api.get('/auth/sessions'),
  revokeSession: (id) => api.delete(`/auth/sessions/${id}`),

  updatePassword: (data) =>
    api.put('/auth/password', data),

  getNotifications: () =>
    api.get('/auth/notifications'),

  updateNotifications: (data) =>
    api.put('/auth/notifications', data),
}