import { queryOptions } from '@tanstack/react-query'
import { fetchOrder } from '@/features/orders/api'
import type { Order } from '@/shared/contracts'

export const orderKeys = {
  all: (userId: string) => ['me', userId, 'orders'] as const,
  detail: (userId: string, orderId: string) => ['me', userId, 'orders', orderId] as const,
}

/**
 * Status do pedido. Quem muda o pendente é o `order.updated` do socket; o REST entra no boot,
 * no refresh e na reconexão. Pedido terminal não é buscado de novo.
 */
export const orderQuery = (userId: string, orderId: string) =>
  queryOptions({
    queryKey: orderKeys.detail(userId, orderId),
    queryFn: ({ signal }) => fetchOrder(orderId, signal),
    staleTime: (query) => (query.state.data && query.state.data.status !== 'pending' ? Infinity : 0),
  })

export const isTerminal = (order: Order) => order.status !== 'pending'
