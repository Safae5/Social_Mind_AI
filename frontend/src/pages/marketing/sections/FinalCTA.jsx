import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function FinalCTA() {
  const { isAuthenticated, getDashboardPath } = useAuth()

  return (
    <section className="relative py-28 bg-[#05060a] overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-500/10 to-violet-600/10 blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl sm:text-4xl font-bold text-white tracking-tight text-balance leading-tight"
        >
          Your social media is generating signals every day.
          <br />
          Start turning them into decisions.
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-10"
        >
          <Link
            to={isAuthenticated ? getDashboardPath() : '/register'}
            className="group inline-flex items-center gap-2 text-sm font-semibold px-7 py-4 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 text-[#05060a] hover:opacity-90 transition-all shadow-[0_0_50px_-12px_rgba(139,92,246,0.5)]"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Start using Social Mind AI'}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
