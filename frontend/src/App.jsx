import { Routes, Route, Navigate } from 'react-router-dom'

// ── Page publique ─────────────────────────────────────────────
import LandingPage from '@/pages/marketing/LandingPage'

// ── Pages Auth ────────────────────────────────────────────────
import LoginPage         from '@/pages/auth/LoginPage'
import RegisterPage      from '@/pages/auth/RegisterPage'
import VerifyEmailPage   from '@/pages/auth/VerifyEmailPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import OAuthCallbackPage from '@/pages/auth/OAuthCallbackPage'
import SessionsPage        from '@/pages/auth/SessionsPage'
import LinkedAccountsPage  from '@/pages/auth/LinkedAccountsPage'
import TwoFactorSetupPage  from '@/pages/auth/TwoFactorSetupPage'
import TwoFactorVerifyPage from '@/pages/auth/TwoFactorVerifyPage'
import SuccessPage from '@/pages/subscription/SuccessPage'
import ProfessionalOnboarding from '@/pages/dashboard/professional/onboarding/ProfessionalOnboarding'
import ProfessionalDashboard  from '@/pages/dashboard/professional/ProfessionalDashboard'
import ProfessionalSettingsPage from '@/pages/dashboard/professional/settings/ProfessionalSettingsPage'
import ClientWorkspacePage from '@/pages/dashboard/professional/clients/ClientWorkspacePage'



// ── Pages Dashboard ───────────────────────────────────────────
import StandardDashboard from '@/pages/dashboard/standard/StandardDashboard'
import BusinessDashboard from '@/pages/dashboard/business/BusinessDashboard'
import AdminApp          from '@/features/admin/AdminApp'

// ── Pages Abonnement ─────────────────────────────────────────
import UpgradePage       from '@/pages/subscription/UpgradePage'

// ── Routes protégées ─────────────────────────────────────────
import ProtectedRoute    from '@/routes/ProtectedRoute'
import RoleRoute         from '@/routes/RoleRoute'

export default function App() {
  return (
    <Routes>
      {/* ── Routes publiques ── */}
      <Route path="/"               element={<LandingPage />} />
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/register"       element={<RegisterPage />} />
      <Route path="/verify-email"   element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/callback"  element={<OAuthCallbackPage />} />
      <Route path="/upgrade"        element={<UpgradePage />} />

      {/* ── Routes protégées ── */}
      <Route element={<ProtectedRoute />}>
        <Route path="/sessions"         element={<SessionsPage />} />
        <Route path="/linked-accounts"  element={<LinkedAccountsPage />} />
        <Route path="/2fa-setup"         element={<TwoFactorSetupPage />} />
        <Route path="/2fa-verify"        element={<TwoFactorVerifyPage />} />
        <Route path="/subscription/success"  element={<SuccessPage />} />

        {/* Dashboard Utilisateur Standard */}
        <Route element={<RoleRoute allowedRoles={['standard']} />}>
          <Route path="/dashboard/*" element={<StandardDashboard />} />
        </Route>

        {/* Dashboard Business */}
          <Route element={<RoleRoute allowedRoles={['business']} />}>
            <Route path="/business/*"  element={<BusinessDashboard />} />
            </Route>
           {/* Nouvelles routes professionnelles imbriquées dans le même guard */}
          <Route element={<RoleRoute allowedRoles={['business']} />}>
    <Route path="/dashboard/professional/onboarding" element={<ProfessionalOnboarding />} />
    <Route path="/dashboard/professional/settings"    element={<ProfessionalSettingsPage />} />
    <Route path="/dashboard/professional/clients/:clientId" element={<ClientWorkspacePage />} />
    <Route path="/dashboard/professional/*"           element={<ProfessionalDashboard />} />
  </Route>

        {/* Dashboard Admin */}
        <Route element={<RoleRoute allowedRoles={['admin']} />}>
          <Route path="/admin/*"     element={<AdminApp />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}