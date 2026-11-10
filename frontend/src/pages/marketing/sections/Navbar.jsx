import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import logo from '@/assets/logo.png'
import { Wordmark } from '@/components/brand/Wordmark'

const NAV_LINKS = [
  { href: '#platform', label: 'Platform' },
  { href: '#agents',   label: 'AI Agents' },
  { href: '#features', label: 'Features' },
  { href: '#pricing',  label: 'Pricing' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isAuthenticated, getDashboardPath } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#05060a]/85 backdrop-blur-xl border-b border-white/10'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src={logo} alt="Social Mind AI" className="w-8 h-8 object-contain" />
          <Wordmark className="text-[15px] font-semibold tracking-tight" />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to={getDashboardPath()}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-white text-[#05060a] hover:bg-white/90 transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm text-white/70 hover:text-white transition-colors px-3 py-2">
                Sign in
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-violet-500 text-[#05060a] hover:opacity-90 transition-opacity"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden text-white/80 p-2"
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="md:hidden bg-[#05060a]/95 backdrop-blur-xl border-b border-white/10 px-6 py-4 space-y-3">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block text-sm text-white/70 hover:text-white py-1.5"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 flex flex-col gap-2 border-t border-white/10">
            {isAuthenticated ? (
              <Link to={getDashboardPath()} className="text-center text-sm font-medium px-4 py-2.5 rounded-lg bg-white text-[#05060a]">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-center text-sm text-white/80 px-4 py-2.5 rounded-lg border border-white/15">
                  Sign in
                </Link>
                <Link to="/register" className="text-center text-sm font-medium px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-400 to-violet-500 text-[#05060a]">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
