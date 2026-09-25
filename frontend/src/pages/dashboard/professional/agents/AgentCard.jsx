// frontend/src/pages/dashboard/professional/agents/AgentCard.jsx
import { motion } from 'framer-motion'
import { ExternalLink, AlertCircle, CheckCircle, Clock, Wifi, WifiOff } from 'lucide-react'

const STATUS_CONFIG = {
  active  : { label: 'Active',   color: 'text-green-400',  bg: 'bg-green-400/10',  dot: 'bg-green-400',  Icon: CheckCircle },
  running : { label: 'Running',  color: 'text-blue-400',   bg: 'bg-blue-400/10',   dot: 'bg-blue-400',   Icon: Clock },
  idle    : { label: 'Idle',     color: 'text-white/40',   bg: 'bg-white/5',       dot: 'bg-white/30',   Icon: CheckCircle },
  error   : { label: 'Error',    color: 'text-red-400',    bg: 'bg-red-400/10',    dot: 'bg-red-400',    Icon: AlertCircle },
  offline : { label: 'Offline',  color: 'text-gray-400',   bg: 'bg-gray-400/10',   dot: 'bg-gray-500',   Icon: WifiOff },
}

const COLOR_BORDERS = {
  indigo: 'border-indigo-500/20 hover:border-indigo-500/40',
  blue  : 'border-blue-500/20 hover:border-blue-500/40',
  purple: 'border-purple-500/20 hover:border-purple-500/40',
  pink  : 'border-pink-500/20 hover:border-pink-500/40',
  green : 'border-green-500/20 hover:border-green-500/40',
  amber : 'border-amber-500/20 hover:border-amber-500/40',
  red   : 'border-red-500/20 hover:border-red-500/40',
}

export function AgentCard({ agent, client, expanded = false, onOpen }) {
  const statusCfg   = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle
  const borderClass = COLOR_BORDERS[agent.color] || COLOR_BORDERS.indigo

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0  }}
      className={`bg-[#1A1A2E] border ${borderClass} rounded-2xl p-5 flex flex-col gap-4 transition-all cursor-pointer group`}
      onClick={onOpen}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{agent.icon}</div>
          <div>
            <h3 className="text-sm font-semibold text-white leading-tight">{agent.name}</h3>
            <div className={`flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-xs w-fit ${statusCfg.bg}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} ${agent.status === 'running' ? 'animate-pulse' : ''}`} />
              <span className={statusCfg.color}>{statusCfg.label}</span>
            </div>
          </div>
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-white/20 group-hover:text-white/60 transition-colors flex-shrink-0" />
      </div>

      {/* Description */}
      <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{agent.description}</p>

      {/* Stats */}
      <div className="flex items-center gap-4">
        <div>
          <p className="text-lg font-bold text-white">{agent.completed_tasks}</p>
          <p className="text-[10px] text-white/30">tâches réalisées</p>
        </div>
        {agent.running_tasks > 0 && (
          <div>
            <p className="text-lg font-bold text-blue-400">{agent.running_tasks}</p>
            <p className="text-[10px] text-white/30">en cours</p>
          </div>
        )}
        {agent.error_count > 0 && (
          <div>
            <p className="text-lg font-bold text-red-400">{agent.error_count}</p>
            <p className="text-[10px] text-white/30">erreurs</p>
          </div>
        )}
      </div>

      {/* Dernière activité */}
      {agent.last_activity && (
        <div className="pt-3 border-t border-white/5">
          <p className="text-[10px] text-white/30 mb-1">Dernière activité</p>
          <p className="text-xs text-white/60 line-clamp-1">{agent.last_activity.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-white/30">{agent.last_activity.time}</span>
            {agent.last_activity.client && (
              <span className="text-[10px] text-indigo-400">· {agent.last_activity.client}</span>
            )}
          </div>
        </div>
      )}

      {/* Capacités (si expanded) */}
      {expanded && agent.capabilities && (
        <div className="pt-3 border-t border-white/5">
          <p className="text-[10px] font-medium text-white/40 mb-2">Capacités</p>
          <div className="flex flex-wrap gap-1">
            {agent.capabilities.slice(0, 3).map(cap => (
              <span key={cap} className="text-[10px] px-2 py-0.5 bg-white/5 text-white/40 rounded-full border border-white/10">
                {cap}
              </span>
            ))}
            {agent.capabilities.length > 3 && (
              <span className="text-[10px] px-2 py-0.5 bg-white/5 text-white/40 rounded-full border border-white/10">
                +{agent.capabilities.length - 3}
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}