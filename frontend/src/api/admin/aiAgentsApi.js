// frontend/src/api/admin/aiAgentsApi.js
import api from '@/lib/axios'

export const adminAiAgentsApi = {
  list        : ()               => api.get('/admin/ai-agents'),
  show        : (slug)           => api.get(`/admin/ai-agents/${slug}`),
  toggle      : (slug, enabled)  => api.post(`/admin/ai-agents/${slug}/toggle`, { enabled }),
  logs        : (params)         => api.get('/admin/ai-agents/logs', { params }),
  costs       : ()               => api.get('/admin/ai-agents/costs'),
  getConfig   : (slug)           => api.get(`/admin/ai-agents/${slug}/config`),
  updateConfig: (slug, configKey, desiredValue) =>
    api.patch(`/admin/ai-agents/${slug}/config`, { config_key: configKey, desired_value: desiredValue }),
}
