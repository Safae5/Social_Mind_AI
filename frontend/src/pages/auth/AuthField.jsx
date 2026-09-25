import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

// Dark-themed input for the Login/Register split-screen redesign only.
// Same prop contract as components/ui/Input.jsx (label, error, hint,
// forwardRef) so it drops in wherever {...register(...)} is spread —
// components/ui/Input.jsx itself is untouched since 13 other pages
// still depend on its light-theme styling.
export const AuthField = forwardRef(function AuthField(
  { label, error, hint, className, type = 'text', ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-white/80">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={cn(
          'w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white/[0.03] text-white',
          'placeholder:text-white/25 transition-all duration-200 ease-out',
          'focus:outline-none focus:bg-white/[0.05]',
          error
            ? 'border-red-400/60 focus:border-red-400 focus:ring-2 focus:ring-red-400/20'
            : 'border-white/10 hover:border-white/20 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/15',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-white/35">{hint}</p>
      )}
    </div>
  )
})
