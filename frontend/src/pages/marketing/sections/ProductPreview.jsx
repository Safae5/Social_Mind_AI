import { motion } from 'framer-motion'
import { LayoutGrid, Users2, Bot, BarChart3, Receipt, Settings } from 'lucide-react'
import { AGENTS } from '../data/agents'

// Illustrative reconstruction of the real Professional dashboard's own
// navigation and agent roster (not a screenshot of live user data, and not
// fabricated statistics — every label here matches the actual product).
const SIDEBAR_ITEMS = [
  { Icon: LayoutGrid, label: 'Overview' },
  { Icon: Users2,     label: 'Clients CRM' },
  { Icon: Bot,        label: '7 AI Agents', active: true },
  { Icon: BarChart3,  label: 'Analytics' },
  { Icon: Receipt,    label: 'Billing' },
  { Icon: Settings,   label: 'Settings' },
]

export default function ProductPreview() {
  return (
    <section className="relative py-28 bg-[#05060a] overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <span className="text-xs font-medium text-white/50 bg-white/5 border border-white/10 rounded-full px-3 py-1">
            Inside the Platform
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl font-bold text-white tracking-tight text-balance">
            One workspace, seven agents, real coordination.
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl border border-white/10 bg-white/[0.02] shadow-[0_0_80px_-20px_rgba(139,92,246,0.25)] overflow-hidden"
        >
          {/* Window chrome */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
            <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
            <span className="ml-3 text-[11px] text-white/30 font-mono">app.socialmind.ai/dashboard/professional</span>
          </div>

          <div className="flex flex-col sm:flex-row">
            {/* Sidebar */}
            <div className="sm:w-52 shrink-0 border-b sm:border-b-0 sm:border-r border-white/10 p-4 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible">
              {SIDEBAR_ITEMS.map(({ Icon, label, active }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap ${
                    active ? 'bg-white/10 text-white' : 'text-white/40'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </div>
              ))}
            </div>

            {/* Agent grid preview */}
            <div className="flex-1 p-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {AGENTS.map(agent => (
                <div
                  key={agent.slug}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{agent.icon}</span>
                    <span className="text-[9px] font-medium text-emerald-300 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-white/70 leading-snug">
                    {agent.name.replace(' Agent', '')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <p className="text-center text-xs text-white/25 mt-4">
          Illustrative preview of the Social Mind AI dashboard structure.
        </p>
      </div>
    </section>
  )
}
