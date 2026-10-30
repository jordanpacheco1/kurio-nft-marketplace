import { createFileRoute } from '@tanstack/react-router'
import { CartPage } from '@/features/cart/components/cart-page'

// Pública: o visitante também tem carrinho (header `X-Cart-Id`). No login, ele é juntado ao da conta.
export const Route = createFileRoute('/carrinho')({
  component: CartPage,
})
