// frontend/src/features/admin/components/DangerConfirmationDialog.jsx
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

// Pour les actions irréversibles (ban permanent, suppression RGPD) :
// exige un motif écrit + une case cochée explicitement, pas juste un clic.
export function DangerConfirmationDialog({
  open, title, description, requireReason = true, confirmLabel = 'Confirmer', onConfirm, onCancel, loading,
}) {
  const [reason, setReason]   = useState('')
  const [checked, setChecked] = useState(false)

  if (!open) return null

  const canConfirm = checked && (!requireReason || reason.trim().length > 0)

  const handleConfirm = () => {
    onConfirm(reason)
    setReason(''); setChecked(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#14161D] border border-red-500/20 rounded-xl p-5 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-2 mb-1.5">
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        {description && <p className="text-sm text-slate-400 mb-4">{description}</p>}

        {requireReason && (
          <div className="mb-3">
            <label className="block text-xs text-slate-400 mb-1">Motif (obligatoire)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              className="w-full bg-[#0D0F14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-red-500"
              placeholder="Pourquoi cette action ?"
            />
          </div>
        )}

        <label className="flex items-start gap-2 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="mt-0.5 accent-red-500"
          />
          <span className="text-xs text-slate-400">
            Je comprends que cette action est {requireReason ? 'irréversible et' : ''} immédiate.
          </span>
        </label>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-40"
          >
            {loading ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
