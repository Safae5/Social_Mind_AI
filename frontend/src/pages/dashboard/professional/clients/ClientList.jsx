// frontend/src/pages/dashboard/professional/clients/ClientList.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, Archive, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { professionalApi } from '@/api/professionalApi'
import { AddClientModal } from './AddClientModal'

const STATUS_COLORS = {
  active  : 'bg-green-400/10 text-green-400',
  paused  : 'bg-amber-400/10 text-amber-400',
  archived: 'bg-gray-400/10 text-gray-400',
  prospect: 'bg-blue-400/10 text-blue-400',
}

export function ClientList({ clients, onClientAdded }) {
  const navigate = useNavigate()
  const [showAddModal, setShowAddModal] = useState(false)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = clients.filter(c => {
    const matchSearch = !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleArchive = async (client) => {
    if (!window.confirm(`Archiver le client "${client.name}" ?`)) return
    try {
      await professionalApi.deleteClient(client.id)
      toast.success('Client archivé.')
      onClientAdded()
    } catch {
      toast.error('Erreur lors de l\'archivage.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">👥 Clients CRM</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Ajouter un client
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un client..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-white/30"
          />
        </div>
        {['all', 'active', 'paused', 'prospect'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-xl text-sm transition-colors ${
              statusFilter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            {s === 'all' ? 'Tous' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-white/20">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-sm">Aucun client trouvé</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 text-indigo-400 text-sm hover:text-indigo-300"
          >
            + Ajouter votre premier client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((client, idx) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0  }}
              transition={{ delay: idx * 0.05 }}
              className="bg-[#1A1A2E] border border-white/5 hover:border-white/15 rounded-2xl p-5 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {(client.name || client.company_name || 'C')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{client.name || client.company_name || 'Client'}</p>
                    <p className="text-xs text-white/40">{client.company_name || client.niche || 'N/A'}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[client.status] || STATUS_COLORS.active}`}>
                  {client.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {client.monthly_retainer && (
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Retainer mensuel</span>
                    <span className="text-white font-medium">{client.monthly_retainer.toLocaleString('fr-FR')}€</span>
                  </div>
                )}
                {client.platforms?.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {client.platforms.map(p => (
                      <span key={p} className="text-[10px] px-2 py-0.5 bg-white/5 text-white/40 rounded-full border border-white/10">{p}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-white/5">
                <button
                  onClick={() => navigate(`/dashboard/professional/clients/${client.id}`)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 rounded-lg text-xs transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Workspace
                </button>
                <button
                  onClick={() => handleArchive(client)}
                  className="p-2 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg text-xs transition-colors"
                >
                  <Archive className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal ajout client */}
      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); onClientAdded() }}
        />
      )}
    </div>
  )
}