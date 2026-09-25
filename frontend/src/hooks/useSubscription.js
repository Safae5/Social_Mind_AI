import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { subscriptionApi } from '@/api/subscription'
import { useAuth } from '@/context/AuthContext'

// ── Plans disponibles ─────────────────────────────────────────
// ── Plans disponibles — public, pas d'auth requise ────────────
export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn:  async () => {
      try {
        const response = await subscriptionApi.getPlans()
        return response.data.data.plans
      } catch (error) {
        // Retourne tableau vide si erreur
        console.error('Plans error:', error)
        return []
      }
    },
    staleTime: 1000 * 60 * 10,
    retry:     false,
  })
}

// ── Abonnement courant — optionnel si non connecté ────────────
export function useCurrentSubscription() {
  const token = localStorage.getItem('auth_token')

  return useQuery({
    queryKey: ['subscription'],
    queryFn:  async () => {
      try {
        const response = await subscriptionApi.getCurrent()
        return response.data.data.subscription
      } catch {
        return null
      }
    },
    enabled:   !!token,  // ← seulement si token existe
    staleTime: 1000 * 60 * 5,
    retry:     false,
  })
}
// ── Factures ──────────────────────────────────────────────────
export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn:  () => subscriptionApi.getInvoices().then(r => r.data.data.invoices),
    staleTime: 1000 * 60 * 5,
  })
}

// ── Checkout ──────────────────────────────────────────────────
export function useCheckout() {
  return useMutation({
    mutationFn: ({ planSlug, billingCycle }) =>
      subscriptionApi.checkout(planSlug, billingCycle),
    onSuccess: (response) => {
      const { checkout_url } = response.data.data
      // Redirige vers Stripe Checkout
      window.location.href = checkout_url
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || 'Impossible de créer la session de paiement.'
      )
    },
  })
}

// ── Portail Stripe ────────────────────────────────────────────
export function useStripePortal() {
  return useMutation({
    mutationFn: () => subscriptionApi.openPortal(),
    onSuccess: (response) => {
      window.location.href = response.data.data.portal_url
    },
    onError: () => {
      toast.error('Impossible d\'accéder au portail de facturation.')
    },
  })
}

// ── Annulation ────────────────────────────────────────────────
export function useCancelSubscription() {
  const queryClient = useQueryClient()
  const { updateUser } = useAuth()

  return useMutation({
    mutationFn: ({ reason, feedback }) =>
      subscriptionApi.cancel(reason, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      updateUser({ current_plan: 'free_trial' })
      toast.success('Abonnement annulé.')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'annulation.')
    },
  })
}

// ── Succès après checkout ─────────────────────────────────────
export function useCheckoutSuccess() {
  const [searchParams]  = useSearchParams()
  const navigate        = useNavigate()
  const queryClient     = useQueryClient()
  const { updateUser }  = useAuth()
  const sessionId       = searchParams.get('session_id')

  return useQuery({
    queryKey: ['checkout-success', sessionId],
    queryFn:  () => subscriptionApi.confirmSuccess(sessionId)
      .then(r => r.data.data),
    enabled:  !!sessionId,
    staleTime: Infinity,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
      updateUser({ current_plan: data.current_plan })
      toast.success(`Plan ${data.plan_name} activé !`)
    },
  })
}