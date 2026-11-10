// frontend/src/components/brand/Wordmark.jsx
// Single source of truth for the "Social Mind AI" text mark — was previously
// hand-duplicated across 8 files with 4 different colorings (violet "Mind",
// cyan "Mind", plain white, missing "AI" entirely). Matches the reference
// lockup: "Social Mind" solid, "AI" in a top-to-bottom cyan → indigo gradient.

export function Wordmark({ theme = 'dark', className = '' }) {
  return (
    <span className={className}>
      <span className={theme === 'light' ? 'text-gray-900' : 'text-white'}>Social Mind</span>{' '}
      <span className="bg-gradient-to-b from-cyan-400 to-indigo-500 bg-clip-text text-transparent">
        AI
      </span>
    </span>
  )
}

export function WordmarkTagline({ className = '' }) {
  return (
    <p className={className}>
      Analyse · Crée · Automatise · Grandis
    </p>
  )
}

export default Wordmark
