// frontend/src/features/admin/components/StatsCard.jsx
export function StatsCard({ label, value, icon: Icon, hint }) {
  return (
    <div className="bg-[#12141A] border border-white/8 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-slate-500" />}
      </div>
      <p className="text-2xl font-semibold text-white tabular-nums">{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  )
}
