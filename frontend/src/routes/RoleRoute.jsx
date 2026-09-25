import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function RoleRoute({ allowedRoles }) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (user.role === 'admin' && allowedRoles.includes('admin') && !user.two_factor_enabled) {
    return <Navigate to="/2fa-setup" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirige vers le bon dashboard selon le rôle
    if (user.role === 'admin')    return <Navigate to="/admin" replace />
    if (user.role === 'business') return <Navigate to="/dashboard/professional" replace />
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}