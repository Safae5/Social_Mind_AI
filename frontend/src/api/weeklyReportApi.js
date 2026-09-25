// frontend/src/api/weeklyReportApi.js
import api from '@/lib/axios'

export const weeklyReportApi = {
  getAll    : ()   => api.get('/weekly-reports'),
  getLatest : ()   => api.get('/weekly-reports/latest'),
  getById   : (id) => api.get(`/weekly-reports/${id}`),
  generateNow: ()  => api.post('/weekly-reports/generate'),
}