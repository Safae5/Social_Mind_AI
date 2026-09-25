// frontend/src/components/professional/ClientSelector.jsx
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Users } from 'lucide-react'

export function ClientSelector({ clients, selectedClient, onSelect }) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (e) => { if (!ref.current?.contains(e.target)) setIsOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const activeClients = clients.filter(c => c.status === 'active')

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition-colors"
      >
        <Users className="h-4 w-4 text-indigo-400" />
        <span className="text-white font-medium">
          {selectedClient ? (selectedClient.name || selectedClient.company_name || 'Client') : 'All Clients'}
        </span>
        {selectedClient && (
          <span className={`w-2 h-2 rounded-full ${
            selectedClient.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
          }`} />
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-[#1A1A2E] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* All Clients */}
          <button
            onClick={() => { onSelect(null); setIsOpen(false) }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors border-b border-white/5 ${
              !selectedClient ? 'bg-indigo-600/20 text-white' : 'text-white/70 hover:bg-white/5'
            }`}
          >
            <Users className="h-4 w-4 text-indigo-400" />
            <div className="text-left">
              <p className="font-medium">All Clients</p>
              <p className="text-xs text-white/40">{activeClients.length} actifs · {clients.length} total</p>
            </div>
          </button>

          {/* Liste des clients */}
          <div className="max-h-64 overflow-y-auto py-1">
            {activeClients.length === 0 ? (
              <p className="text-center text-white/30 text-xs py-4">Aucun client actif</p>
            ) : (
              activeClients.map(client => {
                const displayName = client.name || client.company_name || 'Client'
                return (
                  <button
                    key={client.id}
                    onClick={() => { onSelect(client); setIsOpen(false) }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      selectedClient?.id === client.id
                        ? 'bg-indigo-600/20 text-white'
                        : 'text-white/70 hover:bg-white/5'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
                      {displayName[0].toUpperCase()}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-medium truncate">{displayName}</p>
                      <p className="text-xs text-white/40 truncate">{client.company_name || client.niche}</p>
                    </div>
                    <div className="ml-auto flex-shrink-0">
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}