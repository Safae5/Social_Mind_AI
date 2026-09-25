import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import AuthLayout from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import { useResetPassword } from '@/hooks/useAuth'

const schema = z.object({
  password: z.string()
    .min(8, 'Au moins 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre')
    .regex(/[^A-Za-z0-9]/, 'Au moins un caractère spécial'),
  password_confirmation: z.string(),
}).refine(d => d.password === d.password_confirmation, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['password_confirmation'],
})

export default function ResetPasswordPage() {
  const [searchParams]  = useSearchParams()
  const [showPass, setShowPass] = useState(false)
  const resetMutation   = useResetPassword()

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = (data) => {
    resetMutation.mutate({ ...data, token, email })
  }

  return (
    <AuthLayout
      title="Nouveau mot de passe"
      subtitle="Choisissez un mot de passe sécurisé"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        <div className="relative">
          <Input
            label="Nouveau mot de passe"
            type={showPass ? 'text' : 'password'}
            placeholder="Min. 8 caractères"
            hint="Majuscule, chiffre et caractère spécial requis"
            error={errors.password?.message}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
          >
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <Input
          label="Confirmer le mot de passe"
          type="password"
          placeholder="Répétez le nouveau mot de passe"
          error={errors.password_confirmation?.message}
          {...register('password_confirmation')}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={resetMutation.isPending}
        >
          Réinitialiser mon mot de passe
        </Button>
      </form>
    </AuthLayout>
  )
}