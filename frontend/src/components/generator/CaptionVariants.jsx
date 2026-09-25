// frontend/src/components/generator/CaptionVariants.jsx
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'

const STYLE_CONFIG = {
  'Directe'     : { icon: '⚡', color: 'indigo', desc: 'Hook percutant + message assertif' },
  'Storytelling': { icon: '📖', color: 'purple', desc: 'Narration émotionnelle + histoire' },
  'Éducative'   : { icon: '💡', color: 'green',  desc: 'Valeur concrète + tips et conseils' },
}

const COLOR_MAP = {
  indigo: { border: 'border-indigo-500', bg: 'bg-indigo-50', badge: 'bg-indigo-100 text-indigo-700' },
  purple: { border: 'border-purple-500', bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700' },
  green : { border: 'border-green-500',  bg: 'bg-green-50',  badge: 'bg-green-100 text-green-700'   },
}

const cn = (...c) => c.filter(Boolean).join(' ')

export function CaptionVariants({ variants, selectedId, onSelect }) {
  const [copied, setCopied] = useState(null)

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id)
      toast.success('Légende copiée !')
      setTimeout(() => setCopied(null), 2000)
    })
  }

  if (!variants || variants.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-4xl mb-3">✍️</div>
        <p className="text-sm">Les légendes apparaîtront ici après génération.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">
        ✍️ Choisissez votre légende
      </h2>
      <p className="text-sm text-gray-500">
        Sélectionnez une variante, puis cliquez sur "Publier" →
      </p>

      {variants.map((variant) => {
        const config     = STYLE_CONFIG[variant.style] || { icon: '📝', color: 'indigo', desc: '' }
        const colors     = COLOR_MAP[config.color] || COLOR_MAP.indigo
        const isSelected = selectedId === variant.id

        return (
          <div
            key={variant.id}
            onClick={() => onSelect(variant.id)}
            className={cn(
              'relative border-2 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md',
              isSelected
                ? `${colors.border} ${colors.bg}`
                : 'border-gray-100 bg-white hover:border-gray-200'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{config.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">
                      Variante {variant.id} — {variant.style}
                    </span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', colors.badge)}>
                      {config.desc}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cercle de sélection */}
              <div className={cn(
                'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                isSelected
                  ? `${colors.border.replace('border-', 'bg-').replace('-500', '-600')} border-transparent`
                  : 'border-gray-300'
              )}>
                {isSelected && <Check className="h-4 w-4 text-white" />}
              </div>
            </div>

            {/* Texte de la légende */}
            <div className="bg-white/80 rounded-xl p-4 mb-3 border border-gray-50">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {variant.caption}
              </p>
            </div>

            {/* Stats + actions */}
            <div className="flex items-center justify-between">
              <div className="flex gap-3 text-xs text-gray-400">
                <span>📊 {variant.char_count} chars</span>
                <span>😊 {variant.emoji_count} emojis</span>
                <span>🏷️ {variant.hashtags?.length || 0} hashtags</span>
              </div>

              <button
                type="button"
                onClick={e => { e.stopPropagation(); handleCopy(variant.caption, variant.id) }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors font-medium"
              >
                {copied === variant.id
                  ? <><Check className="h-3.5 w-3.5 text-green-500" /> Copié !</>
                  : <><Copy className="h-3.5 w-3.5" /> Copier</>
                }
              </button>
            </div>

            {/* CTA */}
            {variant.cta && (
              <p className="mt-2 text-xs text-gray-500">
                <span className="font-medium">CTA suggéré :</span> {variant.cta}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}