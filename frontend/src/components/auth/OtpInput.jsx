import { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export default function OtpInput({ length = 6, onComplete, disabled = false, error = false }) {
  const [values, setValues]  = useState(Array(length).fill(''))
  const inputRefs = useRef([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index, e) => {
    const val = e.target.value

    // Accepte seulement les chiffres
    if (!/^\d*$/.test(val)) return

    // Si l'utilisateur colle un code complet
    if (val.length > 1) {
      const digits = val.slice(0, length).split('')
      const newValues = [...Array(length).fill('')]
      digits.forEach((d, i) => { if (i < length) newValues[i] = d })
      setValues(newValues)
      inputRefs.current[Math.min(digits.length, length - 1)]?.focus()
      if (digits.length === length) {
        onComplete?.(newValues.join(''))
      }
      return
    }

    // Saisie normale
    const newValues = [...values]
    newValues[index] = val

    setValues(newValues)

    // Avance au champ suivant
    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Appelle onComplete si tous les champs sont remplis
    if (newValues.every(v => v !== '')) {
      onComplete?.(newValues.join(''))
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!values[index] && index > 0) {
        // Recule au champ précédent
        const newValues = [...values]
        newValues[index - 1] = ''
        setValues(newValues)
        inputRefs.current[index - 1]?.focus()
      } else {
        const newValues = [...values]
        newValues[index] = ''
        setValues(newValues)
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return

    const newValues = Array(length).fill('')
    pasted.split('').forEach((d, i) => { newValues[i] = d })
    setValues(newValues)
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus()

    if (pasted.length === length) {
      onComplete?.(pasted)
    }
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {values.map((val, index) => (
        <input
          key={index}
          ref={el => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={val}
          disabled={disabled}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={cn(
            'w-11 h-12 text-center text-lg font-bold rounded-lg border-2',
            'transition-all duration-150 outline-none',
            'bg-white text-gray-900',
            error
              ? 'border-red-400 bg-red-50'
              : val
                ? 'border-violet-500 bg-violet-50 text-violet-700'
                : 'border-gray-300 focus:border-violet-500',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-50'
          )}
        />
      ))}
    </div>
  )
}