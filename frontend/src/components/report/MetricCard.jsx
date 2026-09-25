// frontend/src/components/report/MetricCard.jsx

const COLOR_MAP = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
  red   : { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-100'    },
  green : { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-100'  },
  amber : { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-100'  },
}

export function MetricCard({ icon, label, value, subtext, color = 'indigo' }) {
  const c = COLOR_MAP[color] || COLOR_MAP.indigo
  return (
    <div className={`${c.bg} border ${c.border} rounded-2xl p-5 text-center shadow-sm`}>
      <div className="text-3xl mb-3">{icon}</div>
      <div className={`text-2xl font-bold ${c.text} mb-1`}>{value}</div>
      <div className="text-sm font-medium text-gray-700">{label}</div>
      {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
    </div>
  )
}