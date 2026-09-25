// frontend/src/api/calendarApi.js
import api from '@/lib/axios'

export const calendarApi = {
  getAll      : ()   => api.get('/calendar'),
  getCurrent  : ()   => api.get('/calendar/current'),
  generateNow : ()   => api.post('/calendar/generate'),
  approveAll  : (id) => api.post(`/calendar/${id}/approve-all`),
  approveSlot : (id) => api.post(`/calendar/slots/${id}/approve`),
  modifySlot  : (id, data) => api.post(`/calendar/slots/${id}/modify`, data),
  skipSlot    : (id) => api.post(`/calendar/slots/${id}/skip`),
  regenerateSlot: (id) => api.post(`/calendar/slots/${id}/regenerate`),
  queueSlot   : (id) => api.post(`/calendar/slots/${id}/queue`),
}