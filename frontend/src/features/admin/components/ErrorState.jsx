// frontend/src/features/admin/components/ErrorState.jsx
import { AlertTriangle, RefreshCw } from 'lucide-react'

export function ErrorState({ message = 'Une erreur est survenue.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle className="h-8 w-8 text-red-500/70 mb-3" />
      <p className="text-sm text-slate-300">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Réessayer
        </button>
      )}
    </div>
  )
}
