import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/features/auth/queries'
import { OrderScreen } from '@/features/orders/components/order-screen'

// Protegida: o pedido é do usuário logado (de outra conta, a API responde 403).
export const Route = createFileRoute('/pedidos/$orderId')({
  beforeLoad: requireAuth,
  component: function OrderRoute() {
    const { orderId } = Route.useParams()
    return <OrderScreen orderId={orderId} />
  },
})
