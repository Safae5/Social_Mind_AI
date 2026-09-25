import { motion } from 'framer-motion'
import { AGENTS, AGENT_COLOR_MAP } from '../data/agents'

export default function AgentsSection() {
  return (
    <section id="agents" className="relative py-28 bg-[#05060a]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-xs font-medium text-violet-300 bg-violet-400/10 border border-violet-400/20 rounded-full px-3 py-1">
            The AI Agent Ecosystem
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl font-bold text-white tracking-tight text-balance">
            Seven agents. One intelligent team.
          </h2>
          <p className="mt-4 text-white/55 leading-relaxed">
            Each agent specializes in one part of your social media operation —
            together they run as a coordinated intelligence layer, not a stack of disconnected tools.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {AGENTS.map((agent, i) => {
            const colors = AGENT_COLOR_MAP[agent.color]
            return (
              <motion.div
                key={agent.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: (i % 4) * 0.06 }}
                className={`group relative rounded-2xl border ${colors.border} bg-white/[0.02] p-5 transition-all duration-300 hover:bg-white/[0.04] hover:-translate-y-1`}
              >
                <div className={`absolute inset-x-0 top-0 h-24 rounded-t-2xl bg-gradient-to-b ${colors.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl">{agent.icon}</span>
                    <span className="text-[11px] font-mono text-white/25">{agent.number}</span>
                  </div>
                  <h3 className={`text-sm font-semibold text-white mb-1.5 leading-snug`}>
                    {agent.name}
                  </h3>
                  <p className="text-xs text-white/50 leading-relaxed">
                    {agent.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
