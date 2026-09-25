// frontend/src/features/admin/components/StatusBadge.jsx
const STATUS_STYLES = {
  active:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  suspended: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  banned:    'bg-red-500/10 text-red-400 border-red-500/20',
  inactive:  'bg-slate-500/10 text-slate-400 border-slate-500/20',
  pending:   'bg-sky-500/10 text-sky-400 border-sky-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  processing:'bg-sky-500/10 text-sky-400 border-sky-500/20',
  failed:    'bg-red-500/10 text-red-400 border-red-500/20',
}

const ROLE_STYLES = {
  admin:    'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  business: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  standard: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
}

export function StatusBadge({ status, kind = 'status' }) {
  const styles = kind === 'role' ? ROLE_STYLES : STATUS_STYLES
  const cls = styles[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  const label = kind === 'role'
    ? { admin: 'Admin', business: 'Professional', standard: 'Standard' }[status] || status
    : { active: 'Actif', suspended: 'Suspendu', banned: 'Banni', inactive: 'Inactif',
        pending: 'En attente', completed: 'Terminé', processing: 'En cours', failed: 'Échoué' }[status] || status

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  )
}
