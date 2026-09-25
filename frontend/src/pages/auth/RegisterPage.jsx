import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Building2, User } from 'lucide-react'
import AuthSplitLayout  from './AuthSplitLayout'
import { AuthField }    from './AuthField'
import { Button }       from '@/components/ui/Button'
import OAuthButtons     from '@/components/auth/OAuthButtons'
import { useRegister }  from '@/hooks/useAuth'
import { cn }           from '@/lib/utils'

const schema = z.object({
  first_name: z.string().min(2, 'Au moins 2 caractères'),
  last_name:  z.string().min(2, 'Au moins 2 caractères'),
  email:      z.string().email('E-mail invalide'),
  phone:      z.string().optional().or(z.literal('')),
  password:   z.string().min(8, 'Au moins 8 caractères'),
  password_confirmation: z.string().min(1, 'Confirmation requise'),
  role: z.enum(['standard', 'business'], {
    required_error: 'Sélectionnez un type de compte',
  }),
}).refine(
  (data) => data.password === data.password_confirmation,
  {
    message: 'Les mots de passe ne correspondent pas',
    path:    ['password_confirmation'],
  }
)

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const registerMutation = useRegister()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(schema),
    defaultValues: {
      first_name:            '',
      last_name:             '',
      email:                 '',
      phone:                 '',
      password:              '',
      password_confirmation: '',
      role:                  'standard',
    },
  })

  const selectedRole = watch('role')

  const onSubmit = (data) => {
    if (!data.phone) delete data.phone
    registerMutation.mutate(data)
  }

  return (
    <AuthSplitLayout
      panelBadge="30-Day Free Trial"
      panelHeadline="Turn social data into intelligent decisions."
      panelSubtext="Join Social Mind AI and put seven specialized AI agents to work on your social media operation."
      title="Créer un compte"
      subtitle="Commencez votre essai gratuit de 30 jours"
    >

      {/* ── Boutons OAuth Google + Facebook ── */}
      <OAuthButtons mode="register" />

      {/* ── Séparateur ── */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[#05060a] px-3 text-white/35 font-medium">
            ou créer un compte avec e-mail
          </span>
        </div>
      </div>

      {/* ── Formulaire ── */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* ── Sélecteur de rôle ── */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Type de compte <span className="text-red-400">*</span>
          </label>

          <input type="hidden" {...register('role')} />

          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'standard', label: 'Utilisateur',   desc: 'Usage personnel', Icon: User },
              { value: 'business', label: 'Professionnel', desc: 'Agence SMMA',     Icon: Building2 },
            ].map(({ value, label, desc, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setValue('role', value, { shouldValidate: true })}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border',
                  'transition-all duration-200 ease-out text-center cursor-pointer active:scale-[0.98]',
                  selectedRole === value
                    ? 'border-cyan-400/50 bg-cyan-400/[0.06] text-cyan-300'
                    : 'border-white/10 hover:border-white/20 bg-white/[0.02] text-white/50'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs opacity-70">{desc}</span>
              </button>
            ))}
          </div>

          {errors.role && (
            <p className="text-xs text-red-400 mt-1">⚠ {errors.role.message}</p>
          )}
        </div>

        {/* ── Prénom + Nom ── */}
        <div className="grid grid-cols-2 gap-3">
          <AuthField
            label="Prénom"
            placeholder="Khalid"
            error={errors.first_name?.message}
            {...register('first_name')}
          />
          <AuthField
            label="Nom"
            placeholder="Benali"
            error={errors.last_name?.message}
            {...register('last_name')}
          />
        </div>

        {/* ── Email ── */}
        <AuthField
          label="Adresse e-mail"
          type="email"
          placeholder="khalid@exemple.com"
          error={errors.email?.message}
          autoComplete="email"
          {...register('email')}
        />

        {/* ── Téléphone (optionnel) ── */}
        <AuthField
          label="Téléphone (optionnel)"
          type="tel"
          placeholder="+212 6XX XXX XXX"
          error={errors.phone?.message}
          {...register('phone')}
        />

        {/* ── Mot de passe ── */}
        <div className="relative">
          <AuthField
            label="Mot de passe"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min. 8 caractères"
            error={errors.password?.message}
            hint="Utilisez majuscule, chiffre et caractère spécial"
            autoComplete="new-password"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-white/30 hover:text-white/70 transition-colors"
          >
            {showPassword
              ? <EyeOff className="h-4 w-4" />
              : <Eye className="h-4 w-4"  />
            }
          </button>
        </div>

        {/* ── Confirmation mot de passe ── */}
        <AuthField
          label="Confirmer le mot de passe"
          type="password"
          placeholder="Répétez le mot de passe"
          error={errors.password_confirmation?.message}
          autoComplete="new-password"
          {...register('password_confirmation')}
        />

        {/* ── Bouton inscription ── */}
        <Button
          type="submit"
          size="lg"
          className="w-full mt-2 bg-gradient-to-r from-cyan-400 to-violet-500 text-[#05060a] hover:opacity-90 focus:ring-cyan-400/40 focus:ring-offset-[#05060a] active:scale-[0.98] transition-all"
          loading={registerMutation.isPending}
          disabled={registerMutation.isPending}
        >
          Créer mon compte gratuitement
        </Button>

        {/* ── Lien connexion ── */}
        <p className="text-center text-sm text-white/40 mt-4">
          Déjà un compte ?{' '}
          <Link
            to="/login"
            className="text-cyan-300 hover:text-cyan-200 font-medium transition-colors"
          >
            Se connecter
          </Link>
        </p>

      </form>
    </AuthSplitLayout>
  )
}
