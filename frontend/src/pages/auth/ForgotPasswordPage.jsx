import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { KeyRound, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import AuthLayout from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import { useForgotPassword } from '@/hooks/useAuth'

const schema = z.object({
  email: z.string().email('E-mail invalide'),
})

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const forgotMutation = useForgotPassword()

  const { register, handleSubmit, getValues, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = (data) => {
    forgotMutation.mutate(data.email, {
      onSuccess: () => setSent(true),
    })
  }

  if (sent) {
    return (
      <AuthLayout title="E-mail envoyé !">
        <div className="text-center py-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 text-sm mb-6">
              Un lien de réinitialisation a été envoyé à{' '}
              <strong>{getValues('email')}</strong>.
            </p>
            <Link to="/login">
              <Button variant="outline" className="w-full">
                ← Retour à la connexion
              </Button>
            </Link>
          </motion.div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Mot de passe oublié ?"
      subtitle="Entrez votre e-mail pour recevoir un lien de réinitialisation"
    >
      <div className="mb-6 flex justify-center">
        <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center">
          <KeyRound className="h-7 w-7 text-violet-600" />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Adresse e-mail"
          type="email"
          placeholder="khalid@exemple.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={forgotMutation.isPending}
        >
          Envoyer le lien
        </Button>

        <Link
          to="/login"
          className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-4"
        >
          ← Retour à la connexion
        </Link>
      </form>
    </AuthLayout>
  )
}