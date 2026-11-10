import { Link } from 'react-router-dom'
import logo from '@/assets/logo.png'
import { Wordmark } from '@/components/brand/Wordmark'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Platform',  href: '#platform' },
      { label: 'Features',  href: '#features' },
      { label: 'AI Agents', href: '#agents' },
      { label: 'Pricing',   href: '#pricing' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Login',    to: '/login' },
      { label: 'Register', to: '/register' },
    ],
  },
  {
    // Privacy/Terms have no route yet, and there's no real support/contact
    // address configured anywhere in the backend (.env only has a MAIL_FROM
    // noreply sender) — I'm not inventing legal text or a contact address.
    // All three rendered as plain (non-link) labels until real destinations
    // exist; see the implementation summary for what's needed.
    title: 'Legal',
    links: [
      { label: 'Privacy', pending: true },
      { label: 'Terms',   pending: true },
      { label: 'Contact', pending: true },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-[#05060a] border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="Social Mind AI" className="w-7 h-7 object-contain" />
              <Wordmark className="text-sm font-semibold" />
            </div>
            <p className="text-xs text-white/40 mt-4 leading-relaxed max-w-[200px]">
              AI-powered social media intelligence for modern marketing teams.
            </p>
          </div>

          {COLUMNS.map(col => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wide mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(link => (
                  <li key={link.label}>
                    {link.pending ? (
                      <span className="text-sm text-white/25 cursor-default">{link.label}</span>
                    ) : link.to ? (
                      <Link to={link.to} className="text-sm text-white/45 hover:text-white transition-colors">
                        {link.label}
                      </Link>
                    ) : (
                      <a href={link.href} className="text-sm text-white/45 hover:text-white transition-colors">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-white/10 text-center">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Social Mind AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
