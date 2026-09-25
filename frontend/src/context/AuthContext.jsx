import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '@/lib/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // ── Charge l'utilisateur au démarrage ─────────────────────
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('user')

    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
        setIsAuthenticated(true)
      } catch {
        logout()
      }
    }
    setLoading(false)
  }, [])

  // ── Connexion ─────────────────────────────────────────────
  const login = useCallback((userData, token, refreshToken) => {
    localStorage.setItem('auth_token',    token)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('user',          JSON.stringify(userData))
    setUser(userData)
    setIsAuthenticated(true)
  }, [])

  // ── Déconnexion ───────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // On se déconnecte quand même côté client
    } finally {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      setUser(null)
      setIsAuthenticated(false)
    }
  }, [])

  // ── Mise à jour utilisateur ───────────────────────────────
  const updateUser = useCallback((updatedData) => {
    const newUser = { ...user, ...updatedData }
    setUser(newUser)
    localStorage.setItem('user', JSON.stringify(newUser))
  }, [user])

  // ── Helpers rôles ─────────────────────────────────────────
  const isAdmin    = user?.role === 'admin'
  const isBusiness = user?.role === 'business'
  const isStandard = user?.role === 'standard'
  const isProfessional = user?.role === 'professional'

  // ── Redirection selon rôle ────────────────────────────────
  const getDashboardPath = useCallback(() => {
    if (!user) return '/login'
    if (user.role === 'admin')    return '/admin'
    if (user.role === 'business') return '/dashboard/professional'
    return '/dashboard'
  }, [user])

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated,
      isAdmin,
      isBusiness,
      isStandard,
      isProfessional,
      login,
      logout,
      updateUser,
      getDashboardPath,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook d'accès au contexte
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return context
}