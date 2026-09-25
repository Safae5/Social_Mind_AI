// frontend/src/features/admin/components/Pagination.jsx
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({ currentPage, lastPage, total, perPage, onPageChange }) {
  if (lastPage <= 1) return null

  const from = (currentPage - 1) * perPage + 1
  const to   = Math.min(currentPage * perPage, total)

  return (
    <div className="flex items-center justify-between px-1 py-3 border-t border-white/8">
      <p className="text-xs text-slate-500">
        {from}–{to} sur {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs text-slate-400 px-2 tabular-nums">
          {currentPage} / {lastPage}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= lastPage}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
