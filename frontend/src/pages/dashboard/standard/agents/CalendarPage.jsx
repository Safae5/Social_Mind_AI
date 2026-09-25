// frontend/src/pages/dashboard/standard/agents/CalendarPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, RefreshCw, CheckSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { DaySlotCard  } from '@/components/calendar/DaySlotCard'
import { WeekSummary  } from '@/components/calendar/WeekSummary'
import { SlotEditModal } from '@/components/calendar/SlotEditModal'
import { calendarApi  } from '@/api/calendarApi'

export default function CalendarPage() {
  const navigate = useNavigate()

  const [calendar,     setCalendar]    = useState(null)
  const [isLoading,    setLoading]     = useState(true)
  const [isGenerating, setGenerating]  = useState(false)
  const [editingSlot,  setEditingSlot] = useState(null)

  const loadCalendar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await calendarApi.getCurrent()
      setCalendar(data.data?.calendar || null)
    } catch {
      toast.error('Erreur de chargement du calendrier.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCalendar() }, [loadCalendar])

  // ── Génération ─────────────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await calendarApi.generateNow()
      toast.success('✅ Génération lancée ! Actualisez dans quelques minutes.')
      setTimeout(loadCalendar, 15000)
    } catch {
      toast.error('Erreur lors de la génération.')
    } finally {
      setGenerating(false)
    }
  }

  // ── Update slot dans le state ─────────────────────────────
  const updateSlotInState = (updatedSlot) => {
    setCalendar(prev => {
      if (!prev) return prev
      return {
        ...prev,
        slots: prev.slots.map(s => s.id === updatedSlot.id ? { ...s, ...updatedSlot } : s),
      }
    })
  }

  // ── Actions sur les slots ──────────────────────────────────
  const handleApprove = async (slotId) => {
    try {
      const { data } = await calendarApi.approveSlot(slotId)
      updateSlotInState(data.data?.slot || { id: slotId, status: 'approved' })
      toast.success('✅ Slot approuvé !')
    } catch { toast.error('Erreur approbation.') }
  }

  const handleSkip = async (slotId) => {
    try {
      await calendarApi.skipSlot(slotId)
      updateSlotInState({ id: slotId, status: 'skipped' })
    } catch { toast.error('Erreur.') }
  }

  const handleQueue = async (slotId) => {
    try {
      await calendarApi.queueSlot(slotId)
      updateSlotInState({ id: slotId, status: 'queued' })
      toast.success('📅 Ajouté au Planificateur !')
    } catch { toast.error('Erreur mise en file.') }
  }

  const handleRegenerate = async (slotId) => {
    try {
      const { data } = await calendarApi.regenerateSlot(slotId)
      if (data.data?.slot) updateSlotInState(data.data.slot)
      toast.success('🔄 Jour régénéré !')
    } catch { toast.error('Erreur régénération.') }
  }

  const handleSaveEdit = async (slotId, editData) => {
    try {
      const { data } = await calendarApi.modifySlot(slotId, editData)
      if (data.data?.slot) updateSlotInState(data.data.slot)
      setEditingSlot(null)
      toast.success('✅ Modifications sauvegardées !')
    } catch { toast.error('Erreur modification.') }
  }

  const handleApproveAll = async () => {
    if (!calendar) return
    try {
      const { data } = await calendarApi.approveAll(calendar.id)
      toast.success(data.message || '✅ Tout approuvé !')
      loadCalendar()
    } catch { toast.error('Erreur approbation globale.') }
  }

  // ── Stats ──────────────────────────────────────────────────
  const stats = calendar ? {
    total    : calendar.slots?.filter(s => !s.is_rest_day).length || 0,
    approved : calendar.slots?.filter(s => ['approved', 'modified'].includes(s.status)).length || 0,
    queued   : calendar.slots?.filter(s => s.status === 'queued').length || 0,
    rest_days: calendar.slots?.filter(s => s.is_rest_day).length || 0,
  } : {}

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Chargement du calendrier...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4]">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              📅 Calendrier de Contenu IA
              <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-medium">
                Mistral 7B · KeyBERT · MiniLM
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Plan personnalisé 7 jours — généré chaque dimanche à 9h
            </p>
          </div>
          <div className="flex gap-3">
            {calendar && (
              <button
                onClick={handleApproveAll}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <CheckSquare className="h-4 w-4" />
                Tout approuver
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Génération...' : 'Générer maintenant'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* État vide */}
        {!calendar ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-xl font-medium text-gray-700 mb-2">Aucun calendrier disponible</p>
            <p className="text-sm text-gray-400 mb-6">
              Le prochain calendrier sera généré automatiquement dimanche à 9h.<br />
              Connectez un compte social pour commencer.
            </p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {isGenerating ? '⏳ Génération...' : '🚀 Générer maintenant'}
            </button>
          </div>
        ) : (
          <>
            {/* Résumé semaine */}
            <WeekSummary
              calendar={calendar}
              stats={stats}
              onApproveAll={handleApproveAll}
            />

            {/* Grille 7 colonnes — viewport desktop */}
            <div className="hidden lg:grid grid-cols-7 gap-3">
              {(calendar.slots || []).map(slot => (
                <DaySlotCard
                  key={slot.id}
                  slot={slot}
                  onApprove={() => handleApprove(slot.id)}
                  onSkip={() => handleSkip(slot.id)}
                  onQueue={() => handleQueue(slot.id)}
                  onRegenerate={() => handleRegenerate(slot.id)}
                  onEdit={() => setEditingSlot(slot)}
                />
              ))}
            </div>

            {/* Vue liste — mobile / tablet */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {(calendar.slots || []).map(slot => (
                <DaySlotCard
                  key={slot.id}
                  slot={slot}
                  onApprove={() => handleApprove(slot.id)}
                  onSkip={() => handleSkip(slot.id)}
                  onQueue={() => handleQueue(slot.id)}
                  onRegenerate={() => handleRegenerate(slot.id)}
                  onEdit={() => setEditingSlot(slot)}
                />
              ))}
            </div>

            {/* Conseil cohérence */}
            {calendar.coherence_level && calendar.coherence_score && (
              <div className={`p-4 rounded-xl text-sm border ${
                calendar.coherence_level === '🟢' ? 'bg-green-50 border-green-200 text-green-700' :
                calendar.coherence_level === '🟡' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-red-50 border-red-200 text-red-700'
              }`}>
                <span className="font-medium">{calendar.coherence_level} Score de cohérence thématique : {Math.round(calendar.coherence_score * 100)}%</span>
                {calendar.coherence_level === '🔴' && (
                  <p className="mt-1 text-xs opacity-80">
                    Le plan est peu cohérent avec votre niche. Régénérez les slots les moins pertinents.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal édition */}
      {editingSlot && (
        <SlotEditModal
          slot={editingSlot}
          onSave={(editData) => handleSaveEdit(editingSlot.id, editData)}
          onClose={() => setEditingSlot(null)}
        />
      )}
    </div>
  )
}