import { motion } from 'framer-motion'
import { BarChart3, Sparkles, CalendarClock, TrendingUp, Users, Search, Bot } from 'lucide-react'

const FEATURES = [
  {
    Icon: BarChart3,
    title: 'AI Analytics',
    description: 'Real engagement metrics forecasted forward with Prophet and XGBoost — not vanity numbers.',
  },
  {
    Icon: Sparkles,
    title: 'Content Intelligence',
    description: 'Captions, visuals and video scripts generated per client, with an approval step before anything publishes.',
  },
  {
    Icon: CalendarClock,
    title: 'Smart Scheduling',
    description: 'Optimal posting times predicted per account from your own engagement history, not generic best-practice charts.',
  },
  {
    Icon: TrendingUp,
    title: 'Trend Detection',
    description: 'Topic modeling surfaces what themes are actually working in your niche right now.',
  },
  {
    Icon: Users,
    title: 'Audience Intelligence',
    description: 'Understand who engages, when, and why — segmented from real audience behavior.',
  },
  {
    Icon: Search,
    title: 'Competitive Intelligence',
    description: 'Track competitor strategy and sentiment, and get counter-strategy suggestions grounded in the data.',
  },
  {
    Icon: Bot,
    title: 'AI Agents',
    description: 'Seven specialized agents that coordinate as one intelligence layer across your entire social operation.',
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-28 bg-[#05060a]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-xs font-medium text-cyan-300 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-3 py-1">
            Platform Capabilities
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl font-bold text-white tracking-tight text-balance">
            Everything runs on real intelligence, not templates.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ Icon, title, description }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-white/20 hover:bg-white/[0.04] transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400/15 to-violet-500/15 border border-white/10 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-cyan-300" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1.5">{title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
