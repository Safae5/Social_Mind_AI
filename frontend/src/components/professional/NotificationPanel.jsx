// frontend/src/components/professional/NotificationPanel.jsx
import { useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'

const STATUS_STYLES = {
  success: 'text-green-400 bg-green-400/10',
  error  : 'text-red-400 bg-red-400/10',
  running: 'text-blue-400 bg-blue-400/10',
  pending: 'text-amber-400 bg-amber-400/10',
}

export function NotificationPanel({ activity, isOpen, onToggle, onClose }) {
  const ref = useRef(null)
  const hasErrors = activity.some(a => a.status === 'error')
  const recent = activity.slice(0, 10)

  useEffect(() => {
    const handleClick = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        className="p-2 text-white/40 hover:text-white/80 hover:bg-white/5 rounded-lg transition-colors relative"
      >
        <Bell className="h-4 w-4" />
        {hasErrors && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-[#1A1A2E] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-sm font-semibold text-white">Notifications</p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {recent.length === 0 ? (
              <p className="text-center text-white/30 text-xs py-8">Aucune notification</p>
            ) : (
              recent.map(log => {
                const statusStyle = STATUS_STYLES[log.status] || STATUS_STYLES.pending
                return (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors">
                    <span className="text-lg flex-shrink-0 mt-0.5">{log.agent?.icon || '🤖'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-white/80">{log.agent?.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusStyle}`}>
                          {log.status}
                        </span>
                      </div>
                      <p className="text-xs text-white/40 mt-0.5 truncate">{log.description}</p>
                      <p className="text-[10px] text-white/25 mt-0.5">{log.time_ago}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
