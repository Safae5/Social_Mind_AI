// Real agent roster, sourced from AgentController::getAgentDescription()
// (backend/app/Http/Controllers/Api/Professional/AgentController.php).
// Translated to English for the marketing site; the underlying tech stack
// and capabilities are the actual product, not invented copy.
export const AGENTS = [
  {
    slug: 'account-manager',
    number: '01',
    icon: '🎯',
    color: 'indigo',
    name: 'Account Manager Agent',
    description:
      'Transcribes client meetings and automatically generates personalized 30-day marketing strategies using Whisper and Mistral 7B.',
  },
  {
    slug: 'social-manager',
    number: '02',
    icon: '📱',
    color: 'blue',
    name: 'Social Manager Agent',
    description:
      'Plans content across multiple accounts, predicts optimal posting times with Prophet, monitors comments, and drafts AI replies.',
  },
  {
    slug: 'content-strategy',
    number: '03',
    icon: '📊',
    color: 'purple',
    name: 'Content Strategist Agent',
    description:
      'Analyzes competitors via the Meta Graph API, discovers content themes with BERTopic, and builds content calendars with Mistral 7B.',
  },
  {
    slug: 'content-creator',
    number: '04',
    icon: '✨',
    color: 'pink',
    name: 'Content Creator Agent',
    description:
      'Generates captions, visuals, and video scripts tailored per client, with an approval workflow before anything goes live.',
  },
  {
    slug: 'analytics',
    number: '05',
    icon: '📈',
    color: 'cyan',
    name: 'Analytics Agent',
    description:
      'Collects metrics every 6 hours via the Meta Graph API, forecasts future performance with Prophet and XGBoost, and generates PDF reports.',
  },
  {
    slug: 'ad-optimizer',
    number: '06',
    icon: '💰',
    color: 'amber',
    name: 'Ad Optimizer Agent',
    description:
      'Optimizes Meta Ads and Google Ads campaigns, predicts CTR with XGBoost, and adapts bidding strategy with reinforcement learning.',
  },
  {
    slug: 'competitive-intel',
    number: '07',
    icon: '🔍',
    color: 'violet',
    name: 'Competitive Intelligence Agent',
    description:
      'Tracks up to 10 competitors per client, analyzes their strategy with clustering models, and drafts counter-strategies with Mistral 7B.',
  },
]

// Colors are keyed against real Tailwind utility fragments used consistently
// across agent-related sections (hero glow, card borders, icon backgrounds).
export const AGENT_COLOR_MAP = {
  indigo: { border: 'border-indigo-500/30 hover:border-indigo-400/60', text: 'text-indigo-300', glow: 'from-indigo-500/20' },
  blue:   { border: 'border-blue-500/30 hover:border-blue-400/60',     text: 'text-blue-300',   glow: 'from-blue-500/20' },
  purple: { border: 'border-purple-500/30 hover:border-purple-400/60', text: 'text-purple-300', glow: 'from-purple-500/20' },
  pink:   { border: 'border-pink-500/30 hover:border-pink-400/60',     text: 'text-pink-300',   glow: 'from-pink-500/20' },
  cyan:   { border: 'border-cyan-500/30 hover:border-cyan-400/60',     text: 'text-cyan-300',   glow: 'from-cyan-500/20' },
  amber:  { border: 'border-amber-500/30 hover:border-amber-400/60',   text: 'text-amber-300',  glow: 'from-amber-500/20' },
  violet: { border: 'border-violet-500/30 hover:border-violet-400/60', text: 'text-violet-300', glow: 'from-violet-500/20' },
}
