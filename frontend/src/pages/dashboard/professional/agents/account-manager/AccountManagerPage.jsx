// AccountManagerPage.jsx
// Agent Chef de Compte — Dashboard Professionnel Social Mind AI
// Whisper (openai/whisper-large-v3) · Mistral 7B · spaCy fr_core_news_md · ReportLab
// Cohérent avec le reste du dashboard professionnel (thème sombre #0F0F1A)

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Download, RefreshCw, Eye, X, FileAudio, FileVideo, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { accountManagerApi } from '@/api/accountManagerApi'

// ── Configuration statuts pipeline ────────────────────────────
const STATUT_CONFIG = {
  en_attente   : { label: '⏳ En attente',                    color: 'text-white/50',   bg: 'bg-white/10',       progress: 0,   dot: 'bg-white/30'  },
  transcription: { label: '🎙️ Whisper — Transcription',      color: 'text-blue-400',   bg: 'bg-blue-400/15',    progress: 20,  dot: 'bg-blue-400'  },
  extraction   : { label: '🤖 Mistral 7B — Extraction TAL',  color: 'text-purple-400', bg: 'bg-purple-400/15',  progress: 50,  dot: 'bg-purple-400'},
  strategie    : { label: '📅 Mistral 7B — Stratégie 30j',   color: 'text-indigo-400', bg: 'bg-indigo-400/15',  progress: 75,  dot: 'bg-indigo-400'},
  pdf          : { label: '📄 ReportLab — Génération PDF',   color: 'text-amber-400',  bg: 'bg-amber-400/15',   progress: 90,  dot: 'bg-amber-400' },
  termine      : { label: '✅ Pipeline terminé',             color: 'text-green-400',  bg: 'bg-green-400/15',   progress: 100, dot: 'bg-green-400' },
  erreur       : { label: '❌ Erreur',                       color: 'text-red-400',    bg: 'bg-red-400/15',     progress: 0,   dot: 'bg-red-400'   },
}

const ACCEPTED_FORMATS = '.mp3,.wav,.mp4,.m4a,.mov,.ogg,.webm'
const MAX_SIZE_MB       = 200

const FILE_TYPE_ICONS = {
  mp4: '🎬', mov: '🎬', avi: '🎬', webm: '🎬',
  mp3: '🎵', wav: '🎵', m4a: '🎵', ogg: '🎵',
}

const PLATFORM_EMOJIS = {
  instagram: '📸', tiktok: '🎵', facebook: '👥',
  linkedin : '💼', twitter: '🐦', youtube:  '▶️',
}

const cn = (...c) => c.filter(Boolean).join(' ')

// ══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function AccountManagerPage({ client } = {}) {
  const [analyses,     setAnalyses]    = useState([])
  const [isLoading,    setIsLoading]   = useState(true)
  const [isUploading,  setIsUploading] = useState(false)
  const [isDragging,   setIsDragging]  = useState(false)
  const [selectedFile, setSelectedFile]= useState(null)
  // Pré-rempli quand ouvert depuis le workspace d'un client CRM ; reste
  // un champ libre éditable quand ouvert seul depuis l'onglet Agents IA
  // (comportement inchangé dans ce cas — client est alors undefined).
  const [clientName,   setClientName]  = useState(client?.name || client?.company_name || '')
  const [language,     setLanguage]    = useState('fr')
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [pollingIntervals, setPollingIntervals] = useState({})
  const fileInputRef = useRef(null)

  // ── Chargement de l'historique ─────────────────────────────
  const loadAnalyses = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await accountManagerApi.getAll()
      setAnalyses(data.data?.analyses || [])
    } catch (err) {
      toast.error('Erreur de chargement de l\'historique.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAnalyses()
    return () => {
      // Nettoyage des intervalles au démontage
      Object.values(pollingIntervals).forEach(clearInterval)
    }
  }, [])

  // ── Polling statut pipeline (toutes les 10s) ───────────────
  const startPolling = (analysisId) => {
    const id = setInterval(async () => {
      try {
        const { data } = await accountManagerApi.getStatus(analysisId)
        const status   = data.data

        // Met à jour le statut dans la liste
        setAnalyses(prev => prev.map(a =>
          a.id === analysisId
            ? { ...a, statut: status.statut, statut_label: status.statut_label, statut_progress: status.progress }
            : a
        ))

        if (status.is_complete) {
          clearInterval(id)
          setPollingIntervals(prev => { const next = {...prev}; delete next[analysisId]; return next })
          await loadAnalyses()
          toast.success(`✅ Analyse de "${analyses.find(a => a.id === analysisId)?.client_nom}" terminée !`)
        }

        if (status.has_error) {
          clearInterval(id)
          setPollingIntervals(prev => { const next = {...prev}; delete next[analysisId]; return next })
          toast.error('❌ Erreur pipeline : ' + status.error_message)
        }

      } catch {}
    }, 10000) // toutes les 10 secondes

    setPollingIntervals(prev => ({ ...prev, [analysisId]: id }))
  }

  // ── Sélection fichier ──────────
  // ── Sélection fichier ─────────────────────────────────────
  const handleFileSelect = (file) => {
    if (!file) return
    const ext    = file.name.split('.').pop().toLowerCase()
    const allowed= ['mp3','wav','mp4','m4a','mov','ogg','webm']
    if (!allowed.includes(ext)) {
      toast.error('Format non supporté. Acceptés : MP4, MP3, WAV, M4A, MOV')
      return
    }
    const sizeMb = file.size / (1024 * 1024)
    if (sizeMb > MAX_SIZE_MB) {
      toast.error(`Fichier trop grand (${sizeMb.toFixed(1)} Mo). Maximum : ${MAX_SIZE_MB} Mo`)
      return
    }
    setSelectedFile(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files[0])
  }

  // ── Upload + dispatch du job ───────────────────────────────
  const handleUpload = async () => {
    if (!selectedFile)        { toast.error('Sélectionnez un fichier audio ou vidéo.'); return }
    if (!clientName.trim())   { toast.error('Entrez le nom du client.'); return }

    setIsUploading(true)

    const formData = new FormData()
    formData.append('file',        selectedFile)
    formData.append('client_name', clientName.trim())
    formData.append('language',    language)

    try {
      const { data } = await accountManagerApi.upload(formData)
      toast.success('✅ Upload réussi ! Pipeline IA démarré...')

      // Reset formulaire
      setSelectedFile(null)
      setClientName('')

      // Recharger + démarrer polling pour la nouvelle analyse
      await loadAnalyses()
      startPolling(data.analysis_id)

    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        toast.error('Upload trop long — fichier volumineux ou connexion lente. Réessayez, ou utilisez un fichier plus petit.')
      } else {
        toast.error(err.response?.data?.message || 'Erreur lors de l\'upload.')
      }
    } finally {
      setIsUploading(false)
    }
  }

  // ── Charger le détail d'une analyse ───────────────────────
  const handleViewDetail = async (analysisId) => {
    setIsLoadingDetail(true)
    try {
      const { data } = await accountManagerApi.getOne(analysisId)
      setSelectedDetail(data.data)
      // Marquer comme lu dans la liste
      setAnalyses(prev => prev.map(a =>
        a.id === analysisId ? { ...a, is_read: true } : a
      ))
    } catch {
      toast.error('Erreur de chargement du détail.')
    } finally {
      setIsLoadingDetail(false)
    }
  }

  // ── Téléchargement PDF ─────────────────────────────────────
  const handleDownloadPdf = async (analysis) => {
    try {
      const response = await accountManagerApi.downloadPdf(analysis.id)
      const url      = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const a        = document.createElement('a')
      a.href         = url
      a.download     = `strategie_${analysis.client_nom.replace(/ /g, '_')}_${analysis.id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('📥 PDF téléchargé !')
    } catch {
      toast.error('PDF non disponible.')
    }
  }

  // ── Rendu ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── En-tête Agent ── */}
      <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🎯</span>
          <div>
            <h2 className="text-xl font-bold text-white">Agent Chef de Compte</h2>
            <div className="flex flex-wrap gap-2 mt-1">
              {[
                { label: 'openai/whisper-large-v3',            color: 'bg-blue-500/20 text-blue-300'   },
                { label: 'mistralai/Mistral-7B-Instruct-v0.3', color: 'bg-purple-500/20 text-purple-300'},
                { label: 'spaCy fr_core_news_md',              color: 'bg-green-500/20 text-green-300' },
                { label: 'ReportLab PDF',                      color: 'bg-amber-500/20 text-amber-300' },
              ].map(m => (
                <span key={m.label} className={`text-[10px] px-2 py-0.5 rounded-full font-mono border border-white/10 ${m.color}`}>
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">
          Uploadez un enregistrement de réunion client (Zoom/Teams/Meet) →
          Whisper transcrit → Mistral 7B extrait le profil marketing →
          spaCy identifie les entités nommées → Mistral 7B génère la stratégie 30 jours →
          ReportLab produit le PDF.
        </p>

        {/* Pipeline visuel */}
        <div className="flex items-center gap-1.5 mt-4 flex-wrap">
          {[
            { step: 'Upload fichier', color: 'bg-white/10 text-white/60' },
            { step: '→ Whisper STT',  color: 'bg-blue-500/20 text-blue-300'   },
            { step: '→ Mistral Profil',color: 'bg-purple-500/20 text-purple-300'},
            { step: '→ spaCy NER',    color: 'bg-green-500/20 text-green-300' },
            { step: '→ Mistral 30j',  color: 'bg-indigo-500/20 text-indigo-300'},
            { step: '→ PDF',          color: 'bg-amber-500/20 text-amber-300'  },
          ].map(({ step, color }) => (
            <span key={step} className={`text-xs px-2.5 py-1 rounded-full ${color}`}>{step}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Formulaire d'upload ── */}
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-5">📤 Nouvelle réunion client</h3>

          {/* Zone drag & drop */}
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
              isDragging
                ? 'border-indigo-400 bg-indigo-400/10 scale-[1.01]'
                : 'border-white/15 hover:border-white/30 hover:bg-white/2',
              selectedFile && 'border-green-400/50 bg-green-400/5'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FORMATS}
              onChange={e => handleFileSelect(e.target.files?.[0] || null)}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-2">
                <span className="text-4xl">
                  {FILE_TYPE_ICONS[selectedFile.name.split('.').pop().toLowerCase()] || '📁'}
                </span>
                <p className="text-sm font-semibold text-white">{selectedFile.name}</p>
                <p className="text-xs text-white/40">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} Mo
                </p>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setSelectedFile(null) }}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  ✕ Supprimer
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-4xl opacity-40">🎙️</span>
                <div>
                  <p className="text-sm font-medium text-white/70">
                    Glissez votre enregistrement ici ou cliquez
                  </p>
                  <p className="text-xs text-white/30 mt-1">
                    MP4, MP3, WAV, M4A, MOV — max {MAX_SIZE_MB} Mo
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Formulaire */}
          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Nom du client (ex: Boutique Karama)"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:outline-none"
            >
              <option value="fr" className="bg-slate-800">🇫🇷 Français</option>
              <option value="en" className="bg-slate-800">🇬🇧 English</option>
              <option value="ar" className="bg-slate-800">🇲🇦 Arabe / Darija</option>
            </select>
            <button
              onClick={handleUpload}
              disabled={isUploading || !selectedFile || !clientName.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Analyser la réunion (Whisper → Mistral → PDF)
                </>
              )}
            </button>
          </div>

          {/* Info pipeline */}
          <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <p className="text-xs font-semibold text-indigo-300 mb-1">Pipeline IA :</p>
            <p className="text-xs text-indigo-300/70 leading-relaxed">
              🎙️ Whisper (STT) → 🤖 Mistral 7B (profil JSON) → 🏷️ spaCy (entités) → 📅 Mistral 7B (stratégie 30j) → 📄 ReportLab (PDF)
            </p>
            <p className="text-xs text-white/30 mt-1.5">
              ⏱️ Durée estimée : 3-8 min (Whisper base) · 10-20 min (Whisper large-v3)
            </p>
          </div>
        </div>

        {/* ── Historique des analyses ── */}
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <h3 className="text-base font-semibold text-white">📋 Historique clients</h3>
            <button
              onClick={loadAnalyses}
              disabled={isLoading}
              className="p-1.5 text-white/30 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-16 text-white/20">
              <div className="text-4xl mb-3">🎙️</div>
              <p className="text-sm font-medium">Aucune analyse pour l'instant</p>
              <p className="text-xs mt-1">Uploadez votre première réunion client</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[480px] overflow-y-auto">
              {analyses.map(analysis => {
                const cfg     = STATUT_CONFIG[analysis.statut] || STATUT_CONFIG.en_attente
                const fileExt = analysis.fichier_type
                const isRunning = !['termine','erreur'].includes(analysis.statut)

                return (
                  <div
                    key={analysis.id}
                    className="px-5 py-4 hover:bg-white/2 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Icône fichier */}
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl flex-shrink-0 mt-0.5">
                        {FILE_TYPE_ICONS[fileExt] || '📁'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-white truncate">{analysis.client_nom}</p>
                          {/* Point non-lu */}
                          {!analysis.is_read && analysis.statut === 'termine' && (
                            <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                          )}
                        </div>

                        <p className="text-xs text-white/40 truncate mb-2">
                          {analysis.fichier_nom} · {analysis.taille_mb} Mo
                          {analysis.duree_min && ` · ⏱️ ${analysis.duree_min}`}
                        </p>

                        {/* Badge statut */}
                        <div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs', cfg.bg)}>
                          <div className={cn('w-1.5 h-1.5 rounded-full', cfg.dot, isRunning && 'animate-pulse')} />
                          <span className={cfg.color}>{cfg.label}</span>
                        </div>

                        {/* Barre progression si pipeline en cours */}
                        {isRunning && (
                          <div className="mt-2">
                            <div className="w-full bg-white/10 rounded-full h-1">
                              <div
                                className="bg-indigo-500 h-1 rounded-full transition-all duration-700"
                                style={{ width: `${analysis.statut_progress || cfg.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Niche extraite si terminé */}
                        {analysis.statut === 'termine' && analysis.niche && (
                          <p className="text-xs text-indigo-400 mt-1">
                            Niche : {analysis.niche}
                          </p>
                        )}

                        {/* Message d'erreur */}
                        {analysis.statut === 'erreur' && analysis.erreur && (
                          <p className="text-xs text-red-400 mt-1 line-clamp-1">{analysis.erreur}</p>
                        )}

                        {/* Date */}
                        <p className="text-[10px] text-white/25 mt-1">{analysis.created_ago}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {analysis.statut === 'termine' && (
                          <>
                            <button
                              onClick={() => handleViewDetail(analysis.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Voir
                            </button>
                            {analysis.has_pdf && (
                              <button
                                onClick={() => handleDownloadPdf(analysis)}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg transition-colors"
                              >
                                <Download className="h-3.5 w-3.5" />
                                PDF
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal détail analyse ── */}
      <AnimatePresence>
        {selectedDetail && (
          <AnalysisDetailModal
            analysis={selectedDetail}
            isLoading={isLoadingDetail}
            onClose={() => setSelectedDetail(null)}
            onDownloadPdf={handleDownloadPdf}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MODAL DÉTAIL — Profil client + NER + Résumé exécutif + Plan 30 jours
// ══════════════════════════════════════════════════════════════
function AnalysisDetailModal({ analysis, isLoading, onClose, onDownloadPdf }) {
  const [expandedWeek, setExpandedWeek] = useState(null)

  const profil    = analysis?.profil_client  || {}
  const strategie = analysis?.strategie      || {}
  const entites   = analysis?.entites_ner    || {}

  const WEEK_COLORS = [
    'border-blue-500/30 bg-blue-500/10',     // Semaine 1 Notoriété
    'border-purple-500/30 bg-purple-500/10', // Semaine 2 Engagement
    'border-green-500/30 bg-green-500/10',   // Semaine 3 Conversion
    'border-orange-500/30 bg-orange-500/10', // Semaine 4 Fidélisation
  ]
  const WEEK_HEADER_COLORS = [
    'bg-blue-600/30',
    'bg-purple-600/30',
    'bg-green-600/30',
    'bg-orange-600/30',
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        exit={{ scale: 0.95,    opacity: 0         }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-[#1A1A2E] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* ── Header modal ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              🎯 {analysis?.client_nom}
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              Agent Chef de Compte · Whisper + Mistral 7B + spaCy + ReportLab
            </p>
          </div>
          <div className="flex items-center gap-2">
            {analysis?.has_pdf && (
              <button
                onClick={() => onDownloadPdf(analysis)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <Download className="h-4 w-4" />
                Télécharger PDF
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Contenu scrollable ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Profil client — Mistral 7B extraction TAL ── */}
          {profil.niche && (
            <section>
              <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Profil Client — Extraction Mistral 7B
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'Niche',          value: profil.niche                                        },
                  { label: 'Business',       value: profil.business_name                                },
                  { label: 'Ton',            value: profil.ton_communication                            },
                  { label: 'Budget mensuel', value: profil.budget_mensuel || 'Non mentionné'            },
                  { label: 'Langue contenu', value: profil.langue_contenu                               },
                  { label: 'Audience',       value: profil.audience_cible
                    ? `${profil.audience_cible.age_range || ''} · ${profil.audience_cible.genre || ''} · ${profil.audience_cible.localisation || ''}`
                    : 'N/A' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/5 rounded-xl p-3">
                    <p className="text-[10px] text-white/40 mb-1">{label}</p>
                    <p className="text-xs font-medium text-white/80">{value || 'N/A'}</p>
                  </div>
                ))}
              </div>

              {/* Plateformes */}
              {profil.plateformes?.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {profil.plateformes.map(p => (
                    <span key={p} className="text-xs px-2.5 py-1 bg-indigo-500/15 text-indigo-300 rounded-full border border-indigo-500/20">
                      {PLATFORM_EMOJIS[p] || '📱'} {p}
                    </span>
                  ))}
                </div>
              )}

              {/* Objectifs + concurrents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {profil.objectifs?.length > 0 && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                    <p className="text-xs font-semibold text-green-300 mb-2">🎯 Objectifs</p>
                    {profil.objectifs.map((o, i) => (
                      <p key={i} className="text-xs text-white/60">· {o}</p>
                    ))}
                  </div>
                )}
                {profil.concurrents?.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-xs font-semibold text-red-300 mb-2">⚔️ Concurrents identifiés</p>
                    {profil.concurrents.map((c, i) => (
                      <p key={i} className="text-xs text-white/60">· {c}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* KPIs */}
              {profil.kpis && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                  {[
                    { label: 'Followers visés',    value: profil.kpis.followers_objectif  },
                    { label: 'Engagement visé',    value: profil.kpis.engagement_objectif },
                    { label: 'Leads visés',        value: profil.kpis.leads_objectif      },
                    { label: 'CA visé',            value: profil.kpis.ca_objectif         },
                  ].filter(k => k.value).map(({ label, value }) => (
                    <div key={label} className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-2.5 text-center">
                      <p className="text-xs font-bold text-indigo-300">{value}</p>
                      <p className="text-[10px] text-white/40 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Entités nommées spaCy fr_core_news_md (NER) ── */}
          {(entites.ORG?.length > 0 || entites.PER?.length > 0 || entites.LOC?.length > 0) && (
            <section>
              <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Entités Nommées — spaCy fr_core_news_md (NER)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: '🏢 Marques / Org.', key: 'ORG',  color: 'bg-blue-500/10 border-blue-500/20 text-blue-300'    },
                  { label: '👤 Personnes',       key: 'PER',  color: 'bg-purple-500/10 border-purple-500/20 text-purple-300'},
                  { label: '📍 Lieux',           key: 'LOC',  color: 'bg-green-500/10 border-green-500/20 text-green-300'  },
                  { label: '🔖 Divers',          key: 'MISC', color: 'bg-amber-500/10 border-amber-500/20 text-amber-300'  },
                ].map(({ label, key, color }) => entites[key]?.length > 0 && (
                  <div key={key} className={`rounded-xl p-3 border ${color.split(' ').slice(0,2).join(' ')}`}>
                    <p className={`text-[10px] font-semibold mb-2 ${color.split(' ')[2]}`}>{label}</p>
                    <div className="flex flex-wrap gap-1">
                      {entites[key].slice(0, 8).map(e => (
                        <span key={e} className="text-[10px] px-2 py-0.5 bg-white/10 text-white/60 rounded-full border border-white/10">
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Résumé exécutif Mistral 7B ── */}
          {strategie.resume_executif && (
            <section>
              <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Résumé Exécutif — Mistral 7B
              </h3>
              <div className="bg-indigo-900/30 border border-indigo-500/20 rounded-xl p-4 space-y-2">
                <p className="text-sm font-bold text-white">
                  {strategie.resume_executif.positionnement}
                </p>
                <p className="text-xs text-indigo-300 italic">
                  💡 {strategie.resume_executif.usp}
                </p>
                <p className="text-xs text-white/50 leading-relaxed">
                  {strategie.resume_executif.strategie_globale}
                </p>
              </div>

              {/* KPIs + Budget */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {strategie.kpis_30_jours && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs font-semibold text-white/50 mb-3">🎯 KPIs 30 jours</p>
                    {[
                      { label: 'Followers visés',    value: strategie.kpis_30_jours.followers_vises    },
                      { label: 'Engagement visé',    value: strategie.kpis_30_jours.engagement_vise    },
                      { label: 'Portée estimée',     value: strategie.kpis_30_jours.portee_estimee     },
                      { label: 'Publications total', value: strategie.kpis_30_jours.publications_total },
                    ].map(({ label, value }) => value && (
                      <div key={label} className="flex justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
                        <span className="text-white/50">{label}</span>
                        <span className="text-green-300 font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {strategie.budget_recommande && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs font-semibold text-white/50 mb-3">💰 Budget recommandé</p>
                    {[
                      { label: 'Production contenu', value: strategie.budget_recommande.contenu    },
                      { label: 'Publicité payante',  value: strategie.budget_recommande.pub_payante || 'Non recommandé' },
                      { label: 'Total mensuel',      value: strategie.budget_recommande.total      },
                    ].map(({ label, value }) => value && (
                      <div key={label} className="flex justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
                        <span className="text-white/50">{label}</span>
                        <span className="text-amber-300 font-medium">{value}</span>
                      </div>
                    ))}
                    {strategie.outils_recommandes?.length > 0 && (
                      <p className="text-[10px] text-white/40 mt-3">
                        🛠️ {strategie.outils_recommandes.join(' · ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Plan 30 jours — 4 semaines thématiques ── */}
          {strategie.semaines?.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Plan 30 Jours — 4 Semaines Thématiques
              </h3>
              <div className="space-y-3">
                {strategie.semaines.map((week, weekIdx) => {
                  const isExpanded = expandedWeek === week.numero
                  return (
                    <div
                      key={week.numero}
                      className={cn('border rounded-xl overflow-hidden', WEEK_COLORS[weekIdx % 4])}
                    >
                      {/* Header semaine */}
                      <button
                        onClick={() => setExpandedWeek(isExpanded ? null : week.numero)}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-3 transition-colors text-left',
                          WEEK_HEADER_COLORS[weekIdx % 4]
                        )}
                      >
                        <div>
                          <p className="text-sm font-bold text-white">
                            Semaine {week.numero} — {week.theme}
                          </p>
                          <p className="text-xs text-white/60 mt-0.5">{week.objectif}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-white/40">{week.actions?.length || 0} actions</span>
                          {isExpanded
                            ? <ChevronUp className="h-4 w-4 text-white/50" />
                            : <ChevronDown className="h-4 w-4 text-white/50" />
                          }
                        </div>
                      </button>

                      {/* Actions */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="p-3 space-y-1.5">
                              {(week.actions || []).map((action, i) => (
                                <div key={i} className="flex items-center gap-3 text-xs bg-white/5 rounded-lg px-3 py-2">
                                  <span className="font-mono text-white/40 w-5 flex-shrink-0">J{action.jour}</span>
                                  <span className="text-indigo-400 w-20 capitalize flex-shrink-0">{action.plateforme}</span>
                                  <span className="text-amber-400 w-20 flex-shrink-0">{action.type}</span>
                                  <span className="text-white/70 flex-1 truncate">{action.sujet}</span>
                                  <span className="text-white/30 flex-shrink-0">{action.heure}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Aperçu 3 premières actions si replié */}
                      {!isExpanded && (
                        <div className="px-3 pb-3 space-y-1">
                          {(week.actions || []).slice(0, 2).map((action, i) => (
                            <div key={i} className="flex items-center gap-3 text-xs text-white/50">
                              <span className="font-mono text-white/30 w-5">J{action.jour}</span>
                              <span className="text-indigo-400/70 w-20 capitalize">{action.plateforme}</span>
                              <span className="w-20 text-white/40">{action.type}</span>
                              <span className="flex-1 truncate">{action.sujet}</span>
                            </div>
                          ))}
                          {(week.actions || []).length > 2 && (
                            <p className="text-[10px] text-white/25 pl-8">
                              + {week.actions.length - 2} autres actions — cliquer pour voir
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Transcription Whisper (extrait) ── */}
          {analysis?.transcription?.text && (
            <section>
              <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Transcription Whisper (extrait)
              </h3>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 max-h-48 overflow-y-auto">
                <p className="text-xs text-white/50 leading-relaxed font-mono">
                  {analysis.transcription.text.slice(0, 600)}
                  {analysis.transcription.text.length > 600 && (
                    <span className="text-white/25"> [...transcription complète dans le PDF]</span>
                  )}
                </p>
              </div>
              <p className="text-xs text-white/30 mt-2">
                🎙️ Whisper openai/whisper-large-v3 ·
                {analysis.transcription.mots ? ` ${analysis.transcription.mots} mots` : ''} ·
                {analysis.transcription.duree
                  ? ` ${Math.round(analysis.transcription.duree / 60)} min`
                  : ''}
              </p>
            </section>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}