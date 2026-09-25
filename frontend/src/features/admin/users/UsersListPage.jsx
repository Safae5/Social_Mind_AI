// frontend/src/features/admin/users/UsersListPage.jsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { adminUsersApi } from '@/api/admin/usersApi'
import { PageHeader } from '../components/PageHeader'
import { SearchInput } from '../components/SearchInput'
import { StatusBadge } from '../components/StatusBadge'
import { Pagination } from '../components/Pagination'
import { LoadingState } from '../components/LoadingState'
import { ErrorState } from '../components/ErrorState'
import { EmptyState } from '../components/EmptyState'
import { Users as UsersIcon } from 'lucide-react'

const ROLE_OPTIONS   = [
  { value: '', label: 'Tous les rôles' },
  { value: 'standard', label: 'Standard' },
  { value: 'business', label: 'Professional' },
  { value: 'admin', label: 'Admin' },
]
const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'active', label: 'Actif' },
  { value: 'suspended', label: 'Suspendu' },
  { value: 'banned', label: 'Banni' },
  { value: 'inactive', label: 'Inactif' },
]

export function UsersListPage() {
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch]   = useState('')
  const [role, setRole]       = useState('')
  const [status, setStatus]   = useState('')
  const [page, setPage]       = useState(1)
  const [sortBy, setSortBy]   = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const debounceRef = useRef(null)

  const load = useCallback(() => {
    setLoading(true); setError(null)
    adminUsersApi.list({
      search: search || undefined,
      role: role || undefined,
      status: status || undefined,
      page, sort_by: sortBy, sort_dir: sortDir, per_page: 20,
    })
      .then(r => setResult(r.data.data))
      .catch(() => setError('Impossible de charger la liste des utilisateurs.'))
      .finally(() => setLoading(false))
  }, [search, role, status, page, sortBy, sortDir])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [searchInput])

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortHeader = ({ col, children }) => (
    <button
      onClick={() => toggleSort(col)}
      className="flex items-center gap-1 hover:text-white transition-colors"
    >
      {children}
      {sortBy === col && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
    </button>
  )

  return (
    <div>
      <PageHeader title="Utilisateurs" description="Gestion des comptes de la plateforme" />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Nom ou e-mail…" />
        <select
          value={role}
          onChange={e => { setRole(e.target.value); setPage(1) }}
          className="bg-[#12141A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-[#12141A]">{o.label}</option>)}
        </select>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="bg-[#12141A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-[#12141A]">{o.label}</option>)}
        </select>
      </div>

      <div className="bg-[#12141A] border border-white/8 rounded-xl overflow-hidden">
        {loading ? (
          <LoadingState label="Chargement des utilisateurs…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : result.users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="Aucun utilisateur trouvé" description="Essayez d'ajuster vos filtres ou votre recherche." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left font-medium px-4 py-3">Utilisateur</th>
                    <th className="text-left font-medium px-4 py-3"><SortHeader col="email">E-mail</SortHeader></th>
                    <th className="text-left font-medium px-4 py-3"><SortHeader col="role">Rôle</SortHeader></th>
                    <th className="text-left font-medium px-4 py-3">Plan</th>
                    <th className="text-left font-medium px-4 py-3"><SortHeader col="status">Statut</SortHeader></th>
                    <th className="text-left font-medium px-4 py-3"><SortHeader col="created_at">Inscription</SortHeader></th>
                    <th className="text-left font-medium px-4 py-3"><SortHeader col="last_login_at">Dernière activité</SortHeader></th>
                  </tr>
                </thead>
                <tbody>
                  {result.users.map(u => (
                    <tr
                      key={u.id}
                      onClick={() => navigate(`/admin/users/${u.id}`)}
                      className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-white">{u.full_name}</td>
                      <td className="px-4 py-3 text-slate-400">{u.email}</td>
                      <td className="px-4 py-3"><StatusBadge status={u.role} kind="role" /></td>
                      <td className="px-4 py-3 text-slate-400">{u.current_plan || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                      <td className="px-4 py-3 text-slate-500 tabular-nums">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 tabular-nums">
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('fr-FR') : 'Jamais'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4">
              <Pagination
                currentPage={result.pagination.current_page}
                lastPage={result.pagination.last_page}
                total={result.pagination.total}
                perPage={result.pagination.per_page}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
