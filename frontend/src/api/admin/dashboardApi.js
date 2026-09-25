// frontend/src/api/admin/dashboardApi.js
import api from '@/lib/axios'

export const adminDashboardApi = {
  getOverview: () => api.get('/admin/dashboard'),
}
