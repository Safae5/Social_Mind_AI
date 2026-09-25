// frontend/src/features/admin/components/ConfirmationDialog.jsx
export function ConfirmationDialog({ open, title, description, confirmLabel = 'Confirmer', onConfirm, onCancel, loading }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#14161D] border border-white/10 rounded-xl p-5 max-w-sm w-full shadow-2xl">
        <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
        {description && <p className="text-sm text-slate-400 mb-5">{description}</p>}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
