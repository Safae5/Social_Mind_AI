// frontend/src/pages/dashboard/professional/billing/ClientBilling.jsx
import { useState, useEffect } from 'react'
import { Plus, FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { professionalApi } from '@/api/professionalApi'

const STATUS_CONFIG = {
  draft   : { label: 'Brouillon', color: 'text-white/40',  bg: 'bg-white/5'         },
  sent    : { label: 'Envoyée',   color: 'text-blue-400',  bg: 'bg-blue-400/10'     },
  paid    : { label: 'Payée',     color: 'text-green-400', bg: 'bg-green-400/10'    },
  overdue : { label: 'En retard', color: 'text-red-400',   bg: 'bg-red-400/10'      },
  cancelled:{ label: 'Annulée',   color: 'text-gray-400',  bg: 'bg-gray-400/10'     },
}

export function ClientBilling({ clients, onRefresh }) {
  const [invoices,     setInvoices]     = useState([])
  const [stats,        setStats]        = useState(null)
  const [isLoading,    setIsLoading]    = useState(true)
  const [showCreate,   setShowCreate]   = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  const loadInvoices = async () => {
    setIsLoading(true)
    try {
      const r = await professionalApi.getInvoices({
        status: filterStatus !== 'all' ? filterStatus : undefined
      })
      setInvoices(r.data.data.invoices?.data || [])
      setStats(r.data.data.stats)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadInvoices() }, [filterStatus])

  const handleStatusUpdate = async (invoiceId, newStatus) => {
    try {
      await professionalApi.updateInvoiceStatus(invoiceId, newStatus)
      toast.success(`Statut mis à jour : ${newStatus}`)
      loadInvoices()
    } catch {
      toast.error('Erreur.')
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">💰 Facturation</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouvelle facture
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Revenus encaissés',   value: `${(stats.total_paid || 0).toLocaleString('fr-FR')}€`, Icon: CheckCircle, color: 'text-green-400' },
            { label: 'Factures en attente', value: `${stats.total_pending?.toLocaleString('fr-FR') || 0}€`, Icon: Clock, color: 'text-amber-400' },
            { label: 'En retard',           value: `${stats.overdue_count || 0} facture(s)`, Icon: AlertTriangle, color: 'text-red-400' },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
              <Icon className={`h-5 w-5 ${color}`} />
              <div>
                <p className={`text-lg font-bold ${color}`}>{value}</p>
                <p className="text-xs text-white/40">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtres statut */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'].map(s => (
          <button key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-xl text-xs transition-colors ${
              filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}>
            {STATUS_CONFIG[s]?.label || 'Tous'}
          </button>
        ))}
      </div>

      {/* Liste factures */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 text-white/20">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Aucune facture pour le moment</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map(invoice => {
            const statusCfg = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft
            return (
              <div key={invoice.id} className="bg-[#1A1A2E] border border-white/5 rounded-xl p-4 flex items-center gap-4">
                <FileText className="h-5 w-5 text-white/30 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{invoice.invoice_number}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-white/40">
                    {invoice.client?.name} · Échéance {invoice.due_date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{invoice.total?.toLocaleString('fr-FR')}€</p>
                  <p className="text-xs text-white/30">{invoice.currency}</p>
                </div>
                {/* Actions */}
                <div className="flex gap-1">
                  {invoice.status === 'draft' && (
                    <button
                      onClick={() => handleStatusUpdate(invoice.id, 'sent')}
                      className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20"
                    >
                      Envoyer
                    </button>
                  )}
                  {invoice.status === 'sent' && (
                    <button
                      onClick={() => handleStatusUpdate(invoice.id, 'paid')}
                      className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20"
                    >
                      Marquer payée
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal création facture */}
      {showCreate && (
        <CreateInvoiceModal
          clients={clients}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadInvoices(); onRefresh() }}
        />
      )}
    </div>
  )
}

// Modal création facture
function CreateInvoiceModal({ clients, onClose, onCreated }) {
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    client_id : '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date  : '',
    tax_rate  : 0,
    currency  : 'EUR',
    notes     : '',
    line_items: [{ description: '', quantity: 1, unit_price: 0 }],
  })

  const addLine = () => setForm(f => ({ ...f, line_items: [...f.line_items, { description: '', quantity: 1, unit_price: 0 }] }))
  const removeLine = (idx) => setForm(f => ({ ...f, line_items: f.line_items.filter((_, i) => i !== idx) }))
  const updateLine = (idx, field, value) => setForm(f => ({
    ...f,
    line_items: f.line_items.map((line, i) => i === idx ? { ...line, [field]: value } : line)
  }))

  const subtotal = form.line_items.reduce((s, l) => s + l.quantity * l.unit_price, 0)
  const tax      = subtotal * form.tax_rate / 100
  const total    = subtotal + tax

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await professionalApi.createInvoice(form)
      toast.success('✅ Facture créée !')
      onCreated()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-bold text-white">Nouvelle facture</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/70">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-white/50 mb-1">Client</label>
              <select value={form.client_id}
                onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                required>
                <option value="" className="bg-slate-800">Sélectionner...</option>
                {clients.filter(c => c.status === 'active').map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-800">{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Date émission</label>
              <input type="date" value={form.issue_date}
                onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none" required />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Date échéance</label>
              <input type="date" value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none" required />
            </div>
          </div>

          {/* Lignes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-white/50">Lignes de facturation</label>
              <button type="button" onClick={addLine} className="text-xs text-indigo-400 hover:text-indigo-300">+ Ajouter</button>
            </div>
            {form.line_items.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 mb-2">
                <input className="col-span-6 bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                  value={line.description} placeholder="Description"
                  onChange={e => updateLine(idx, 'description', e.target.value)} required />
                <input className="col-span-2 bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                  type="number" value={line.quantity} min={0.01} step={0.01} placeholder="Qté"
                  onChange={e => updateLine(idx, 'quantity', parseFloat(e.target.value))} />
                <input className="col-span-3 bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                  type="number" value={line.unit_price} min={0} step={0.01} placeholder="Prix unit."
                  onChange={e => updateLine(idx, 'unit_price', parseFloat(e.target.value))} />
                {form.line_items.length > 1 && (
                  <button type="button" onClick={() => removeLine(idx)}
                    className="col-span-1 text-red-400/60 hover:text-red-400 text-xs">✕</button>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">TVA (%)</label>
              <input type="number" min={0} max={100}
                value={form.tax_rate}
                onChange={e => setForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none" />
            </div>
            <div className="flex flex-col justify-end">
              <div className="bg-white/5 rounded-xl p-3 text-right">
                <p className="text-xs text-white/40">Sous-total: {subtotal.toFixed(2)}€</p>
                <p className="text-xs text-white/40">TVA: {tax.toFixed(2)}€</p>
                <p className="text-sm font-bold text-white">Total: {total.toFixed(2)}€</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSaving}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {isSaving ? '⏳...' : '✅ Créer la facture'}
            </button>
            <button type="button" onClick={onClose}
              className="px-6 py-3 border border-white/10 text-white/60 rounded-xl text-sm hover:bg-white/5">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}