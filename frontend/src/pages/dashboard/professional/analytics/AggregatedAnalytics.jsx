// frontend/src/pages/dashboard/professional/analytics/AggregatedAnalytics.jsx

export function AggregatedAnalytics({ analytics, selectedClient }) {
  if (!analytics) {
    return (
      <div className="flex items-center justify-center py-20 text-white/30">
        <div className="text-center">
          <div className="text-4xl mb-3">📈</div>
          <p>Données analytics en cours de chargement...</p>
        </div>
      </div>
    )
  }

  const { kpis, agent_summary, invoice_stats } = analytics

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">
        📈 Analytics Agrégées
        {selectedClient && <span className="text-sm text-white/40 ml-2">— {selectedClient.name}</span>}
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Clients Actifs',     value: kpis?.active_clients  || 0, icon: '👥', suffix: '' },
          { label: 'Revenu Mensuel',     value: `${(kpis?.monthly_revenue || 0).toLocaleString('fr-FR')}`, icon: '💰', suffix: '€' },
          { label: 'Agents Actifs',      value: kpis?.active_agents    || 0, icon: '🤖', suffix: '/7' },
          { label: 'Facturé Total',      value: `${(invoice_stats?.total_paid || 0).toLocaleString('fr-FR')}`, icon: '📊', suffix: '€' },
        ].map(({ label, value, icon, suffix }) => (
          <div key={label} className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
            <span className="text-2xl">{icon}</span>
            <p className="text-2xl font-bold text-white mt-2">{value}{suffix}</p>
            <p className="text-xs text-white/40 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Performances des agents */}
      {agent_summary && (
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Performances des 7 Agents IA</h3>
          <div className="space-y-3">
            {agent_summary.map(agent => (
              <div key={agent.slug} className="flex items-center gap-3">
                <span className="text-xl">{agent.icon}</span>
                <span className="text-sm text-white/60 flex-1">{agent.name}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-green-400">{agent.success} ✓</span>
                  {agent.errors > 0 && <span className="text-red-400">{agent.errors} ✗</span>}
                  {/* Barre */}
                  <div className="w-24 bg-white/10 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, (agent.success / (agent.success + agent.errors + 0.001)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Facturation */}
      {invoice_stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total facturé (payé)', value: `${(invoice_stats.total_paid || 0).toLocaleString('fr-FR')}€`, color: 'text-green-400' },
            { label: 'Factures en attente',  value: invoice_stats.pending || 0, color: 'text-amber-400', suffix: ' factures' },
            { label: 'Factures en retard',   value: invoice_stats.overdue_count || 0, color: 'text-red-400', suffix: ' en retard' },
          ].map(({ label, value, color, suffix = '' }) => (
            <div key={label} className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-4">
              <p className="text-xs text-white/40 mb-1">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value}{suffix}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}