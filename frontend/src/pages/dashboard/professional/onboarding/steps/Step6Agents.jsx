// Step6Agents.jsx — Configuration des 7 agents depuis les .md
import { useState } from 'react'

// Données extraites des 7 fichiers .md
const AGENTS_CONFIG = [
  {
    slug: 'account-manager',
    name: 'Agent Chef de Compte',
    icon: '🎯',
    description: 'Transcrit les réunions clients (Whisper) et génère des stratégies marketing 30 jours personnalisées (Mistral 7B + spaCy + ReportLab).',
    models: ['openai/whisper-large-v3', 'mistralai/Mistral-7B-Instruct-v0.3', 'spaCy fr_core_news_md'],
    inputs: ['Fichiers audio/vidéo (MP4, MP3, WAV, M4A, MOV — max 200 Mo)'],
    outputs: ['Profil client JSON', 'Document onboarding PDF', 'Stratégie 30 jours PDF'],
    color: 'indigo',
    settings: ['auto_generate_strategy', 'language', 'report_format'],
  },
  {
    slug: 'social-manager',
    name: 'Agent Gestionnaire de RS',
    icon: '📱',
    description: 'Planifie le contenu multi-comptes (Prophet), surveille les commentaires (Twitter-RoBERTa) et génère des réponses IA (Mistral 7B) via Meta Graph API.',
    models: ['cardiffnlp/twitter-roberta-base-sentiment-latest', 'mistralai/Mistral-7B-Instruct-v0.3', 'Prophet'],
    inputs: ['Comptes Meta (OAuth)', 'File d\'attente contenu'],
    outputs: ['Planning hebdomadaire', 'Réponses commentaires IA', 'Métriques engagement'],
    color: 'blue',
    settings: ['polling_interval', 'auto_reply', 'sentiment_threshold'],
  },
  {
    slug: 'content-strategy',
    name: 'Agent Stratège de Contenu',
    icon: '📊',
    description: 'Analyse les concurrents (Meta Graph + Playwright), découvre les thèmes (BERTopic + LDA), génère des calendriers 7 jours (Mistral 7B).',
    models: ['paraphrase-multilingual-MiniLM-L12-v2 (BERTopic)', 'mistralai/Mistral-7B-Instruct-v0.3'],
    inputs: ['Profil client (Agent Chef de Compte)', 'URLs concurrents', 'Meta Graph API'],
    outputs: ['Piliers de contenu', 'Calendrier 7 jours', 'Hashtags TF-IDF', 'PDF stratégie'],
    color: 'purple',
    settings: ['competitors_count', 'analysis_frequency', 'calendar_format'],
  },
  {
    slug: 'content-creator',
    name: 'Agent Créateur de Contenu IA',
    icon: '✨',
    description: 'Génère légendes adaptées plateforme (Mistral 7B), visuels 1024×1024 (SDXL-Turbo), scripts vidéo avec workflow d\'approbation avant publication Meta.',
    models: ['mistralai/Mistral-7B-Instruct-v0.3', 'stabilityai/sdxl-turbo', 'paraphrase-multilingual-MiniLM-L12-v2'],
    inputs: ['Client sélectionné', 'Plateforme', 'Sujet', 'Ton'],
    outputs: ['Légende + hashtags + CTA', 'Visuel PNG 1024×1024', 'Script vidéo', 'PDF pack contenu'],
    color: 'pink',
    settings: ['require_approval', 'default_platform', 'brand_voice'],
  },
  {
    slug: 'analytics',
    name: 'Agent Analytics IA',
    icon: '📈',
    description: 'Collecte métriques toutes les 6h (Meta Graph API), prédit les performances 30 jours (Prophet + XGBoost), génère rapports PDF mensuels.',
    models: ['Prophet', 'XGBoost', 'Random Forest / Scikit-learn'],
    inputs: ['Meta Graph API (insights)', 'Playwright (complémentaire)'],
    outputs: ['KPIs dashboard', 'Prédictions 30 jours', '7 graphiques Matplotlib', 'Rapport PDF'],
    color: 'green',
    settings: ['collection_frequency', 'prediction_horizon', 'report_day'],
  },
  {
    slug: 'ad-optimizer',
    name: 'Agent Optimisation Publicitaire',
    icon: '💰',
    description: 'Collecte campagnes Meta Ads + Google Ads quotidiennement, prédit CTR (XGBoost), optimise budget (SciPy linprog), adapte enchères (Q-Learning).',
    models: ['XGBoost (CTR)', 'Scikit-learn RF + GradientBoosting', 'SciPy linprog', 'Q-Learning'],
    inputs: ['Meta Ads API v21', 'Google Ads API (GAQL)', 'Playwright'],
    outputs: ['Prédiction CTR', 'Allocation budget optimisée', 'Rapport ROI PDF', '5 graphiques'],
    color: 'amber',
    settings: ['optimize_frequency', 'max_cpc', 'target_roas'],
  },
  {
    slug: 'competitive-intel',
    name: 'Agent Veille Concurrentielle',
    icon: '🔍',
    description: 'Surveille jusqu\'à 10 concurrents par client (VADER + K-Means + DBSCAN), détecte les patterns viraux (TF-IDF), génère contre-stratégies (Mistral 7B).',
    models: ['VADER + TextBlob', 'NLTK', 'K-Means + DBSCAN / Scikit-learn', 'TF-IDF', 'mistralai/Mistral-7B-Instruct-v0.3'],
    inputs: ['IDs concurrents (max 10)', 'Meta Graph API', 'Playwright'],
    outputs: ['Analyse sentiment', 'Clusters thématiques', 'Patterns viraux', 'Contre-stratégie PDF'],
    color: 'red',
    settings: ['max_competitors', 'collection_frequency', 'alert_threshold'],
  },
]

const COLOR_CLASSES = {
  indigo: 'border-indigo-500/40 bg-indigo-500/10 hover:border-indigo-400',
  blue  : 'border-blue-500/40 bg-blue-500/10 hover:border-blue-400',
  purple: 'border-purple-500/40 bg-purple-500/10 hover:border-purple-400',
  pink  : 'border-pink-500/40 bg-pink-500/10 hover:border-pink-400',
  green : 'border-green-500/40 bg-green-500/10 hover:border-green-400',
  amber : 'border-amber-500/40 bg-amber-500/10 hover:border-amber-400',
  red   : 'border-red-500/40 bg-red-500/10 hover:border-red-400',
}

const BADGE_CLASSES = {
  indigo: 'bg-indigo-500/20 text-indigo-300',
  blue  : 'bg-blue-500/20 text-blue-300',
  purple: 'bg-purple-500/20 text-purple-300',
  pink  : 'bg-pink-500/20 text-pink-300',
  green : 'bg-green-500/20 text-green-300',
  amber : 'bg-amber-500/20 text-amber-300',
  red   : 'bg-red-500/20 text-red-300',
}

export function Step6Agents({ onNext, isSaving, initialData }) {
  const [enabledAgents, setEnabledAgents] = useState(
    initialData?.agents_config ? Object.keys(initialData.agents_config) : AGENTS_CONFIG.map(a => a.slug)
  )
  const [expandedAgent, setExpandedAgent] = useState(null)

  const toggleAgent = (slug) => {
    setEnabledAgents(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const agentsConfig = Object.fromEntries(
      enabledAgents.map(slug => [slug, { enabled: true }])
    )
    onNext({ agents_config: agentsConfig })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Configuration des 7 Agents IA</h2>
        <p className="text-white/50 text-sm">
          Activez les agents dont vous avez besoin. Tous sont activés par défaut.
        </p>
      </div>

      <div className="space-y-3">
        {AGENTS_CONFIG.map(agent => {
          const isEnabled  = enabledAgents.includes(agent.slug)
          const isExpanded = expandedAgent === agent.slug
          const colorClass = COLOR_CLASSES[agent.color] || COLOR_CLASSES.indigo
          const badgeClass = BADGE_CLASSES[agent.color] || BADGE_CLASSES.indigo

          return (
            <div
              key={agent.slug}
              className={`border rounded-xl transition-all ${
                isEnabled ? colorClass : 'border-white/10 bg-white/5'
              }`}
            >
              {/* Header de l'agent */}
              <div className="flex items-center gap-3 p-4">
                <span className="text-2xl">{agent.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{agent.name}</p>
                    {agent.models.slice(0, 2).map(m => (
                      <span key={m} className={`text-xs px-2 py-0.5 rounded-full ${badgeClass}`}>
                        {m.split('/').pop().split('-').slice(0, 2).join('-')}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-white/50 mt-0.5 line-clamp-1">{agent.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setExpandedAgent(isExpanded ? null : agent.slug)}
                    className="text-xs text-white/40 hover:text-white/70 px-2 py-1 rounded"
                  >
                    {isExpanded ? 'Moins ↑' : 'Détails ↓'}
                  </button>
                  {/* Toggle switch */}
                  <button
                    type="button"
                    onClick={() => toggleAgent(agent.slug)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      isEnabled ? 'bg-indigo-600' : 'bg-white/20'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mt-1 ${
                      isEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Détails expandés */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs font-medium text-white/50 mb-1">Modèles IA</p>
                      {agent.models.map(m => (
                        <p key={m} className="text-xs text-white/70">· {m}</p>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white/50 mb-1">Inputs</p>
                      {agent.inputs.map(i => (
                        <p key={i} className="text-xs text-white/70">· {i}</p>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white/50 mb-1">Outputs</p>
                      {agent.outputs.map(o => (
                        <p key={o} className="text-xs text-white/70">· {o}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
        <span className="text-sm text-white/60">{enabledAgents.length}/7 agents activés</span>
        <button
          type="button"
          onClick={() => setEnabledAgents(AGENTS_CONFIG.map(a => a.slug))}
          className="text-xs text-indigo-400 hover:text-indigo-300"
        >
          Tout activer
        </button>
      </div>

      <button type="submit" disabled={isSaving}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm disabled:opacity-50">
        {isSaving ? '⏳ Sauvegarde...' : 'Continuer →'}
      </button>
    </form>
  )
}