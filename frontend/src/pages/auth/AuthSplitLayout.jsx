import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import heroImage from '@/assets/hero-intelligence.png'
import logo from '@/assets/logo.png'

// Split-screen shell for Login/Register only — reuses the exact brand
// tokens already shipped on the landing page (bg #05060a, cyan→violet
// gradient accent, the same hero-intelligence.png) so the auth flow reads
// as the same product, not a bolted-on light-themed form. components/
// layout/AuthLayout.jsx is untouched: Forgot Password, Reset Password,
// Verify Email and 2FA Verify keep their current light theme unchanged.
export default function AuthSplitLayout({
  panelBadge,
  panelHeadline,
  panelSubtext,
  title,
  subtitle,
  children,
}) {
  return (
    <div className="min-h-screen bg-[#05060a] flex flex-col lg:flex-row">
      {/* ── Visual panel — hidden below lg, never squeezed ── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden border-r border-white/10">
        <img
          src={heroImage}
          alt=""
          role="presentation"
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05060a] via-[#05060a]/55 to-[#05060a]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05060a]/20 via-transparent to-[#05060a]/80" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex flex-col justify-end p-12 xl:p-16"
        >
          <span className="inline-flex w-fit items-center gap-2 text-xs font-medium text-cyan-300 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-3 py-1 mb-6">
            {panelBadge}
          </span>
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-[1.15] tracking-tight text-balance max-w-md">
            {panelHeadline}
          </h2>
          <p className="mt-4 text-white/55 leading-relaxed max-w-sm">
            {panelSubtext}
          </p>
        </motion.div>
      </div>

      {/* ── Form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2.5 mb-10 w-fit">
            <img src={logo} alt="Social Mind AI" className="w-8 h-8 object-contain" />
            <span className="text-[15px] font-semibold text-white tracking-tight">
              Social<span className="text-cyan-300">Mind</span> AI
            </span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-1.5 text-sm text-white/50">{subtitle}</p>
            )}

            <div className="mt-8">
              {children}
            </div>
          </motion.div>
        </div>

        <p className="text-center text-xs text-white/25 mt-10">
          © {new Date().getFullYear()} Social Mind AI. Tous droits réservés.
        </p>
      </div>
    </div>
  )
}
