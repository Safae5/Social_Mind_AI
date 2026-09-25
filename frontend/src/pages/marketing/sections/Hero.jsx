import { Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, Play } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import heroVisual from '@/assets/hero-visual.webp'

// The R3F canvas pulls in three.js — lazy-load it so the hero's text and
// CTAs paint immediately and aren't gated behind that chunk downloading.
const HeroScene = lazy(() => import('./HeroScene'))

// Subtle mouse-tracked drift for the hero visual — springs rather than
// following the cursor 1:1, so it feels alive without being distracting.
// Purely decorative: harmless if it never fires (touch devices).
function HeroVisual() {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const springX = useSpring(mx, { stiffness: 60, damping: 15, mass: 0.5 })
  const springY = useSpring(my, { stiffness: 60, damping: 15, mass: 0.5 })
  const rotateX = useTransform(springY, [-20, 20], [4, -4])
  const rotateY = useTransform(springX, [-20, 20], [-4, 4])

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mx.set(((e.clientX - rect.left) / rect.width - 0.5) * 20)
    my.set(((e.clientY - rect.top) / rect.height - 0.5) * 20)
  }
  const handleMouseLeave = () => { mx.set(0); my.set(0) }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full flex justify-center lg:justify-end"
      style={{ perspective: 1000 }}
    >
      {/* Soft atmospheric glow behind the visual — no rectangular container,
          just blurred color bleeding into the dark background. */}
      <div className="absolute inset-0 flex items-center justify-center lg:justify-end pointer-events-none">
        <div className="w-[70%] h-[70%] rounded-full bg-cyan-500/15 blur-[100px]" />
        <div className="absolute w-[50%] h-[50%] rounded-full bg-violet-500/15 blur-[90px] translate-x-1/4" />
      </div>

      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="relative w-full max-w-[600px] lg:max-w-[900px]"
      >
        <img
          src={heroVisual}
          alt="Social Mind AI — AI-powered social media intelligence platform"
          width={1842}
          height={854}
          loading="eager"
          decoding="async"
          className="w-full h-auto drop-shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
        />
      </motion.div>
    </motion.div>
  )
}

export default function Hero() {
  const { isAuthenticated, getDashboardPath } = useAuth()

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#05060a]">
      {/* Cinematic background — drifting particle network, degrades to a
          static glow on reduced-motion/no-WebGL (see HeroScene.jsx). */}
      <Suspense fallback={null}>
        <HeroScene />
      </Suspense>

      {/* Legibility gradients over the scene */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#05060a] via-[#05060a]/50 to-[#05060a] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#05060a] via-[#05060a]/10 to-[#05060a]/60 pointer-events-none" />
      {/* Faint grid — reinforces the "data/intelligence" mood at near-zero cost */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-24 w-full">
        <div className="grid lg:grid-cols-2 gap-y-16 gap-x-8 items-center">
          <div className="max-w-2xl">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 text-xs font-medium text-cyan-300 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-3 py-1 mb-6"
            >
              AI-Powered Social Media Intelligence
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] tracking-tight text-balance"
            >
              Turn Social Data Into{' '}
              <span className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent">
                Intelligent Decisions.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-lg text-white/60 leading-relaxed max-w-xl"
            >
              Social Mind AI brings AI-powered analytics, content intelligence, scheduling
              and social media insights into one intelligent platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <Link
                to={isAuthenticated ? getDashboardPath() : '/register'}
                className="group inline-flex items-center gap-2 text-sm font-semibold px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 text-[#05060a] hover:opacity-90 transition-all shadow-[0_0_40px_-10px_rgba(34,211,238,0.5)]"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Start for free'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#platform"
                className="inline-flex items-center gap-2 text-sm font-medium px-6 py-3.5 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all"
              >
                <Play className="h-3.5 w-3.5" />
                Explore the platform
              </a>
            </motion.div>
          </div>

          <HeroVisual />
        </div>
      </div>
    </section>
  )
}
