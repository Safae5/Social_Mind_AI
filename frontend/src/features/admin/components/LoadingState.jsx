// frontend/src/features/admin/components/LoadingState.jsx
export function LoadingState({ label = 'Chargement…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <div className="w-6 h-6 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin mb-3" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
