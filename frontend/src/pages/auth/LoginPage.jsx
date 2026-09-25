import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import AuthSplitLayout from './AuthSplitLayout'
import { AuthField }   from './AuthField'
import { Button }      from '@/components/ui/Button'
import OAuthButtons    from '@/components/auth/OAuthButtons'
import { useLogin }    from '@/hooks/useAuth'

const schema = z.object({
  email:    z.string().email('E-mail invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
  remember: z.boolean().optional(),
})

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const loginMutation = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver:      zodResolver(schema),
    defaultValues: { remember: false }
  })

  const onSubmit = (data) => loginMutation.mutate(data)

  return (
    <AuthSplitLayout
      panelBadge="AI-Powered Social Media Intelligence"
      panelHeadline="Every signal, one intelligence."
      panelSubtext="Sign back in to keep your analytics, agents and campaigns running exactly where you left them."
      title="Bon retour 👋"
      subtitle="Connectez-vous à votre tableau de bord"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        <AuthField
          label="Adresse e-mail"
          type="email"
          placeholder="khalid@exemple.com"
          error={errors.email?.message}
          autoComplete="email"
          {...register('email')}
        />

        <div className="relative">
          <AuthField
            label="Mot de passe"
            type={showPassword ? 'text' : 'password'}
            placeholder="Votre mot de passe"
            error={errors.password?.message}
            autoComplete="current-password"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-white/30 hover:text-white/70 transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Se souvenir + Mot de passe oublié */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-white/50 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded border-white/20 bg-white/5 text-cyan-400 focus:ring-cyan-400/40 focus:ring-offset-0"
              {...register('remember')}
            />
            Se souvenir de moi
          </label>
          <Link
            to="/forgot-password"
            className="text-sm text-cyan-300 hover:text-cyan-200 font-medium transition-colors"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full bg-gradient-to-r from-cyan-400 to-violet-500 text-[#05060a] hover:opacity-90 focus:ring-cyan-400/40 focus:ring-offset-[#05060a] active:scale-[0.98] transition-all"
          loading={loginMutation.isPending}
        >
          Se connecter
        </Button>

        {/* Boutons OAuth Google + Facebook */}
        <OAuthButtons mode="login" />

        <p className="text-center text-sm text-white/40 mt-2">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-cyan-300 hover:text-cyan-200 font-medium transition-colors">
            S'inscrire gratuitement
          </Link>
        </p>

      </form>
    </AuthSplitLayout>
  )
}
