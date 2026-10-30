import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/features/auth/queries'
import { CheckoutPage } from '@/features/checkout/components/checkout-page'

// Protegida: a cotação e o pedido são do usuário logado. Se a sessão vencer no meio, o rascunho fica no
// sessionStorage e volta depois do login (`redirect=/checkout`).
export const Route = createFileRoute('/checkout')({
  beforeLoad: requireAuth,
  component: CheckoutPage,
})
