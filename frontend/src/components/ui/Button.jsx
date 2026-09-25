import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:  'bg-violet-600 text-white hover:bg-violet-700 focus:ring-violet-500',
    secondary:'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400',
    outline:  'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400',
    ghost:    'text-gray-600 hover:bg-gray-100 focus:ring-gray-400',
    danger:   'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}