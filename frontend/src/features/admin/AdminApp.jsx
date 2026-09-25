// frontend/src/features/admin/AdminApp.jsx
import { Routes, Route } from 'react-router-dom'
import { AdminLayout } from './layout/AdminLayout'
import { AdminDashboardPage } from './dashboard/AdminDashboardPage'
import { UsersListPage } from './users/UsersListPage'
import { UserDetailPage } from './users/UserDetailPage'
import { SubscriptionsListPage } from './subscriptions/SubscriptionsListPage'
import { PlansPage } from './plans/PlansPage'
import { AiAgentsListPage } from './ai-agents/AiAgentsListPage'
import { AiAgentDetailPage } from './ai-agents/AiAgentDetailPage'
import { AiAgentLogsPage } from './ai-agents/AiAgentLogsPage'

export default function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index               element={<AdminDashboardPage />} />
        <Route path="users"        element={<UsersListPage />} />
        <Route path="users/:id"    element={<UserDetailPage />} />
        <Route path="subscriptions" element={<SubscriptionsListPage />} />
        <Route path="plans"        element={<PlansPage />} />
        <Route path="ai-agents"        element={<AiAgentsListPage />} />
        <Route path="ai-agents/logs"   element={<AiAgentLogsPage />} />
        <Route path="ai-agents/:slug"  element={<AiAgentDetailPage />} />
      </Route>
    </Routes>
  )
}
