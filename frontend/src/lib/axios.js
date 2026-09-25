import axios from 'axios'
import { toast } from 'sonner'

const api = axios.create({
  baseURL:         '/api',
  withCredentials: false,  // ← false car on utilise JWT pas cookies
  headers: {
    'Content-Type':     'application/json',
    'Accept':           'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

let isRefreshing = false
let failedQueue  = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token))
  failedQueue = []
}

// ── Intercepteur requête ──────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token      = localStorage.getItem('auth_token')
    const twoFaToken = localStorage.getItem('2fa_session_token')
    if (token)      config.headers.Authorization = `Bearer ${token}`
    if (twoFaToken) config.headers['X-2FA-Token'] = twoFaToken
    return config
  },
  (error) => Promise.reject(error)
)
// ── Pages publiques qui ne doivent pas rediriger ──────────────
const PUBLIC_PAGES = [
  '/upgrade',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/callback',
]
const isPublicPage = () =>
  PUBLIC_PAGES.some(page => window.location.pathname.startsWith(page))

// ── Intercepteur réponse ──────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // ── Abonnement expiré / fonctionnalité non incluse dans le plan ──
    // SubscriptionMiddleware renvoie 402 + { code, redirect: '/upgrade' }
    // pour SUBSCRIPTION_EXPIRED et FEATURE_NOT_AVAILABLE. Avant ce bloc,
    // rien ne lisait ce signal : chaque page gérait l'échec de son propre
    // Promise.all() avec un simple console.error, laissant un tableau de
    // bord bloqué/vide au lieu de rediriger comme le prévoit la spec.
    // isPublicPage() évite une boucle si l'appel qui échoue vient d'une
    // page déjà publique (ex: /upgrade lui-même vérifiant autre chose).
    if (error.response?.status === 402 && error.response?.data?.redirect) {
      const { message, redirect } = error.response.data
      if (!isPublicPage()) {
        toast.error(message || 'Votre abonnement a expiré.')
        // Léger délai pour que le toast soit lisible avant le rechargement
        // complet de la page (window.location.href navigue immédiatement).
        setTimeout(() => { window.location.href = redirect }, 1200)
      }
      return Promise.reject(error)
    }

    if (error.response?.status !== 401) return Promise.reject(error)

    const skipUrls = [
      '/auth/login',
      '/auth/refresh',
      '/auth/logout',
      '/auth/register',
    ]
    if (skipUrls.some(url => originalRequest.url?.includes(url))) {
      return Promise.reject(error)
    }

    if (originalRequest._retry) return Promise.reject(error)

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(token => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing            = true

    const refreshToken = localStorage.getItem('refresh_token')

    if (!refreshToken) {
      isRefreshing = false
      redirectToLogin()
      return Promise.reject(error)
    }

    try {
      const response = await axios.post(
        'http://localhost:8000/api/auth/refresh',
        { refresh_token: refreshToken },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept':       'application/json',
          },
        }
      )

      const { access_token, refresh_token } = response.data.data

      localStorage.setItem('auth_token',    access_token)
      localStorage.setItem('refresh_token', refresh_token)

      api.defaults.headers.Authorization       = `Bearer ${access_token}`
      originalRequest.headers.Authorization    = `Bearer ${access_token}`

      processQueue(null, access_token)
      return api(originalRequest)

    } catch (refreshError) {
      processQueue(refreshError, null)
      redirectToLogin()
      return Promise.reject(refreshError)

    } finally {
      isRefreshing = false
    }
  }
)

function redirectToLogin() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  localStorage.removeItem('2fa_session_token')
  window.location.href = '/login'
}

export default api