import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { useCurrentUser } from '@/features/auth/queries'
import { cartKeys } from '@/features/cart/keys'
import { clearPendingOrder, usePendingOrder } from '@/features/orders/pending'
import { orderQuery } from '@/features/orders/queries'
import { ApiError } from '@/shared/api/errors'

/**
 * Retoma o pedido pendente salvo (boot, refresh, outra aba). Quando ele termina, limpa o registro,
 * atualiza o carrinho (o mock tirou os itens comprados) e avisa se o usuário estiver em outra tela.
 */
export function PendingOrderWatcher() {
  const { user } = useCurrentUser()
  const pending = usePendingOrder(user?.id ?? null)
  if (!user || !pending) return null
  return <Watch key={pending.orderId} userId={user.id} orderId={pending.orderId} />
}

function Watch({ userId, orderId }: { userId: string; orderId: string }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { pathname } = useLocation()
  const order = useQuery(orderQuery(userId, orderId))
  const status = order.data?.status
  const lost = order.error instanceof ApiError && (order.error.code === 'NOT_FOUND' || order.error.code === 'FORBIDDEN')
  const onOrderPage = pathname === `/pedidos/${orderId}`

  useEffect(() => {
    if (lost) clearPendingOrder(orderId) // pedido sumiu (reset do mock) ou é de outra conta
    if (!status || status === 'pending') return
    clearPendingOrder(orderId)
    void queryClient.invalidateQueries({ queryKey: cartKeys.user(userId) })
    void queryClient.invalidateQueries({ queryKey: ['me', userId, 'quote'] })
    if (onOrderPage) return
    const open = () => void router.navigate({ to: '/pedidos/$orderId', params: { orderId } })
    if (status === 'confirmed') toast.success('Pagamento confirmado', { action: { label: 'Ver recibo', onClick: open } })
    else toast.error('Pagamento recusado', { action: { label: 'Ver pedido', onClick: open } })
    // Só reage à mudança de status; trocar de tela depois não avisa de novo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, lost])

  return null
}
