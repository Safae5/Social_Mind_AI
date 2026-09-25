// frontend/src/components/scheduler/SchedulerCalendar.jsx
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

const PLATFORM_COLORS = {
  instagram: 'bg-pink-500',
  facebook : 'bg-blue-600',
  tiktok   : 'bg-gray-900',
}

export default function SchedulerCalendar({ upcomingPosts, optimalSlots, onAddToQueue, onCancelPost }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay]   = useState(null)

  // Jours du mois
  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end  : endOfMonth(currentMonth),
    })
  }, [currentMonth])

  // Posts par jour
  const postsByDay = useMemo(() => {
    const map = {}
    upcomingPosts.forEach(post => {
      const key = format(new Date(post.scheduled_at), 'yyyy-MM-dd')
      if (!map[key]) map[key] = []
      map[key].push(post)
    })
    return map
  }, [upcomingPosts])

  // Créneaux optimaux par jour de semaine
  const optimalByDay = useMemo(() => {
    const map = {}
    optimalSlots.forEach(slot => {
      if (!map[slot.day_of_week]) map[slot.day_of_week] = []
      map[slot.day_of_week].push(slot)
    })
    return map
  }, [optimalSlots])

  const getDayPosts = (date) => {
    return postsByDay[format(date, 'yyyy-MM-dd')] || []
  }

  const getDaySlots = (date) => {
    const dayOfWeek = (date.getDay() + 6) % 7 // 0=Lundi
    return optimalByDay[dayOfWeek] || []
  }

  // Posts du jour sélectionné
  const selectedDayPosts = selectedDay ? getDayPosts(selectedDay) : []

  const DAYS_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const startDayOfWeek = (startOfMonth(currentMonth).getDay() + 6) % 7

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header calendrier */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>
        <h3 className="text-base font-semibold text-gray-900 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </h3>
        <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      <div className="flex">
        {/* Grille calendrier */}
        <div className="flex-1 p-4">
          {/* Entêtes jours */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS_NAMES.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
            ))}
          </div>

          {/* Jours */}
          <div className="grid grid-cols-7 gap-1">
            {/* Cases vides au début */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map(day => {
              const posts    = getDayPosts(day)
              const slots    = getDaySlots(day)
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              const today    = isToday(day)

              return (
                <div
                  key={day.toString()}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`
                    min-h-[70px] p-1.5 rounded-xl cursor-pointer border transition-all
                    ${isSelected ? 'border-indigo-400 bg-indigo-50' : 'border-transparent hover:border-gray-200 hover:bg-gray-50'}
                    ${today ? 'ring-2 ring-indigo-500 ring-inset' : ''}
                  `}
                >
                  <span className={`text-xs font-medium block mb-1 ${
                    today ? 'text-indigo-600 font-bold' : 'text-gray-700'
                  }`}>
                    {format(day, 'd')}
                  </span>

                  {/* Points créneaux optimaux */}
                  {slots.length > 0 && posts.length === 0 && (
                    <div className="flex gap-0.5 flex-wrap">
                      {slots.slice(0, 3).map((slot, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-200" title={slot.time} />
                      ))}
                    </div>
                  )}

                  {/* Posts planifiés */}
                  {posts.slice(0, 2).map(post => (
                    <div key={post.id}
                         className={`text-[10px] px-1 py-0.5 rounded text-white truncate mb-0.5 ${
                           PLATFORM_COLORS[post.platform] || 'bg-gray-500'
                         }`}>
                      {format(new Date(post.scheduled_at), 'HH:mm')} {post.caption?.slice(0, 15)}
                    </div>
                  ))}
                  {posts.length > 2 && (
                    <div className="text-[10px] text-gray-400">+{posts.length - 2} autres</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Panneau latéral — jour sélectionné */}
        {selectedDay && (
          <div className="w-72 border-l border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900 capitalize">
                {format(selectedDay, 'EEEE d MMMM', { locale: fr })}
              </h4>
              <button
                onClick={onAddToQueue}
                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {selectedDayPosts.length === 0 ? (
              <div className="text-center text-gray-400 py-6">
                <p className="text-sm">Aucune publication</p>
                <button
                  onClick={onAddToQueue}
                  className="text-xs text-indigo-500 hover:underline mt-1"
                >
                  Ajouter du contenu →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayPosts.map(post => (
                  <div key={post.id}
                       className={`p-3 rounded-xl text-sm ${
                         PLATFORM_COLORS[post.platform]?.replace('bg-', 'bg-opacity-10 bg-')
                         || 'bg-gray-50'
                       } border border-gray-100`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold capitalize">{post.platform}</span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(post.scheduled_at), 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 line-clamp-2">{post.caption}</p>
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => window.confirm('Annuler ?') && onCancelPost(post.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Créneaux optimaux du jour */}
            {getDaySlots(selectedDay).length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 mb-2">⚡ Créneaux optimaux :</p>
                <div className="flex flex-wrap gap-1">
                  {getDaySlots(selectedDay).map(slot => (
                    <span key={slot.id}
                          className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">
                      {slot.time} (#{slot.rank})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 px-6 py-3 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-200" />
          <span>Créneau optimal disponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-pink-500" />
          <span>Publication Instagram</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-600" />
          <span>Publication Facebook</span>
        </div>
      </div>
    </div>
  )
}