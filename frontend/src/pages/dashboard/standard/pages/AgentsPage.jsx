import { useNavigate } from 'react-router-dom'

const AGENTS = [
  {
    id     : 'planificateur',
    path   : '/dashboard/agents/planificateur',
    emoji  : '📅',
    name   : 'Planificateur Intelligent',
    tagline: 'Trouve les meilleurs moments pour publier',
    desc   : 'Analysez 90 jours de données réelles. L\'IA identifie vos créneaux optimaux avec Prophet et KMeans.',
    badge  : 'bg-indigo-100 text-indigo-700',
    btn    : 'bg-indigo-600 hover:bg-indigo-700',
    border : 'border-indigo-100',
    bg     : 'bg-indigo-50',
    features: ['📊 Analyse 90 jours de données', '⏰ Créneaux optimaux par IA', '📋 File d\'attente intelligente', '📧 Rappels email automatiques'],
  },
  {
    id     : 'legendes',
    path   : '/dashboard/agents/legendes',
    emoji  : '✍️',
    name   : 'Générateur de Légendes',
    tagline: 'Crée 3 légendes adaptées à chaque réseau',
    desc   : 'Mistral 7B génère 3 variantes de légendes. Voix de marque personnalisée. Image avec SDXL-Turbo.',
    badge  : 'bg-violet-100 text-violet-700',
    btn    : 'bg-violet-600 hover:bg-violet-700',
    border : 'border-violet-100',
    bg     : 'bg-violet-50',
    features: ['✍️ 3 variantes de légendes', '🎨 Voix de marque IA', '🖼️ Image SDXL-Turbo', '📲 Publication directe'],
  },
  {
    id     : 'hashtags',
    path   : '/dashboard/agents/hashtags',
    emoji  : '#️⃣',
    name   : 'Hashtags & Tendances',
    tagline: 'Hashtags qui font décoller vos posts',
    desc   : 'KeyBERT + Mistral 7B génèrent 15-30 hashtags catégorisés. Tendances réelles via Meta Graph API.',
    badge  : 'bg-green-100 text-green-700',
    btn    : 'bg-green-600 hover:bg-green-700',
    border : 'border-green-100',
    bg     : 'bg-green-50',
    features: ['#️⃣ 15-30 hashtags catégorisés', '📈 Tendances Meta Graph API', '🎯 Angles de contenu', '⭐ Favoris sauvegardés'],
  },
  {
    id     : 'inbox',
    path   : '/dashboard/inbox',
    emoji  : '💬',
    name   : 'Répondeur Automatique',
    tagline: 'Répondez à vos commentaires avec l\'IA',
    desc   : 'Twitter-RoBERTa classifie chaque commentaire. Mistral 7B génère la réponse. Vous approuvez avant envoi.',
    badge  : 'bg-blue-100 text-blue-700',
    btn    : 'bg-blue-600 hover:bg-blue-700',
    border : 'border-blue-100',
    bg     : 'bg-blue-50',
    features: ['🟢 Classification automatique', '⚫ Détection spam', '💬 Réponses Mistral 7B', '✅ Approbation humaine'],
  },
  {
    id     : 'reports',
    path   : '/dashboard/reports',
    emoji  : '📊',
    name   : 'Résumé Hebdomadaire',
    tagline: 'Vos performances en 30 secondes',
    desc   : 'Chaque lundi à 8h, un résumé clair en langage simple. Zéro jargon. Juste l\'essentiel pour progresser.',
    badge  : 'bg-amber-100 text-amber-700',
    btn    : 'bg-amber-600 hover:bg-amber-700',
    border : 'border-amber-100',
    bg     : 'bg-amber-50',
    features: ['📬 Rapport lundi 8h auto', '📈 Évolution en langage simple', '🏆 Meilleure publication', '💡 Conseil actionnable'],
  },
  {
    id     : 'calendar',
    path   : '/dashboard/calendar',
    emoji  : '🗓️',
    name   : 'Calendrier de Contenu',
    tagline: 'Un plan 7 jours chaque dimanche',
    desc   : 'Chaque dimanche à 9h, Mistral 7B génère votre plan personnalisé. Type, sujet, heure — tout préparé.',
    badge  : 'bg-pink-100 text-pink-700',
    btn    : 'bg-pink-600 hover:bg-pink-700',
    border : 'border-pink-100',
    bg     : 'bg-pink-50',
    features: ['🗓️ Plan 7 jours auto dimanche', '🎯 Personnalisé pour votre niche', '✏️ Modifier ou régénérer', '📋 Envoi au Planificateur'],
  },
]

export default function AgentsPage() {
  const navigate = useNavigate()
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">🤖 Vos outils IA</h1>
        <p className="text-gray-500 text-sm">6 agents IA travaillent pour vous. Cliquez sur un outil pour commencer.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {AGENTS.map((agent) => (
          <div key={agent.id}
               className={`border-2 ${agent.border} ${agent.bg} rounded-2xl p-6 flex flex-col gap-4 hover:shadow-md transition-shadow`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{agent.emoji}</div>
                <div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${agent.badge}`}>
                    🤖 Agent IA
                  </span>
                  <h3 className="text-base font-bold text-gray-900 mt-1">{agent.name}</h3>
                </div>
              </div>
            </div>

            <p className="text-sm font-medium text-gray-700">{agent.tagline}</p>
            <p className="text-sm text-gray-500 leading-relaxed">{agent.desc}</p>

            <ul className="space-y-1.5">
              {agent.features.map((f, i) => (
                <li key={i} className="text-xs text-gray-600">{f}</li>
              ))}
            </ul>

            <button onClick={() => navigate(agent.path)}
                    className={`mt-auto w-full py-2.5 text-white rounded-xl text-sm font-medium transition-colors ${agent.btn}`}>
              Ouvrir cet outil →
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}