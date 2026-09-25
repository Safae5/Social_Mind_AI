// frontend/src/pages/dashboard/professional/activity/LiveActivityFeed.jsx
import { RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const STATUS_STYLES = {
  success: 'text-green-400 bg-green-400/10',
  error  : 'text-red-400 bg-red-400/10',
  running: 'text-blue-400 bg-blue-400/10',
  pending: 'text-amber-400 bg-amber-400/10',
}

export function LiveActivityFeed({ activity, onRefresh }) {
  return (
    <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Live Activity Feed
        </h2>
        <button
          onClick={onRefresh}
          className="p-1.5 text-white/30 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
        <AnimatePresence>
          {activity.length === 0 ? (
            <div className="text-center py-10 text-white/20 text-sm">
              <div className="text-3xl mb-2">🤖</div>
              Aucune activité pour le moment
            </div>
          ) : (
            activity.map((log, idx) => {
              const statusStyle = STATUS_STYLES[log.status] || STATUS_STYLES.pending
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0   }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-white/2 transition-colors"
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">{log.agent?.icon || '🤖'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-white/80">{log.agent?.name}</span>
                      {log.client && (
                        <span className="text-xs text-indigo-400">· {log.client.name}</span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusStyle}`}>
                        {log.status}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 mt-0.5 truncate">{log.description}</p>
                  </div>
                  <span className="text-[10px] text-white/25 flex-shrink-0 mt-1">{log.time_ago}</span>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}