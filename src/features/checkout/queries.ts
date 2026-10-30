import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { cartKeys } from '@/features/cart/keys'
import { createQuote } from '@/features/checkout/api'
import { clearDraft } from '@/features/checkout/storage'
import { createOrder } from '@/features/orders/api'
import { savePendingOrder } from '@/features/orders/pending'
import { orderKeys } from '@/features/orders/queries'
import { ApiError } from '@/shared/api/errors'
import type { CreateOrder, Network, Order, Quote } from '@/shared/contracts'
import { announce } from '@/shared/ui/announcer'

export const quoteKeys = {
  all: (userId: string) => ['me', userId, 'quote'] as const,
  network: (userId: string, network: Network) => ['me', userId, 'quote', network] as const,
}

/** Cotação da rede escolhida. `staleTime` 0: o `nft.updated` e a reconexão invalidam e ela é refeita. */
export const quoteQuery = (userId: string, network: Network) =>
  queryOptions({
    queryKey: quoteKeys.network(userId, network),
    queryFn: ({ signal }) => createQuote(network, signal),
    staleTime: 0,
  })

/**
 * Cria o pedido. A chave de idempotência é calculada antes do `mutate`, então o reenvio
 * automático (uma vez, só em falha transitória como o timeout) e o "Tentar de novo" usam a mesma.
 */
export function useCreateOrder(userId: string) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: ({ input, key }: { input: CreateOrder; key: string }) => createOrder(input, key),
    retry: (failureCount, error) => failureCount < 1 && error instanceof ApiError && error.isTransient,
    retryDelay: 500,
    onSuccess: (order) => {
      savePendingOrder({ orderId: order.id, userId })
      clearDraft(userId)
      queryClient.setQueryData<Order>(orderKeys.detail(userId, order.id), order)
      queryClient.removeQueries({ queryKey: quoteKeys.all(userId) }) // a cotação foi consumida
      announce('Pedido criado. Aguardando a confirmação do pagamento.')
      void navigate({ to: '/pedidos/$orderId', params: { orderId: order.id } })
    },
    onError: (error) => {
      // A API já devolve a cotação nova: ela entra no cache e a tela mostra o que mudou.
      if (error instanceof ApiError && error.code === 'QUOTE_STALE' && error.quote) {
        const quote: Quote = error.quote
        queryClient.setQueryData(quoteKeys.network(userId, quote.network), quote)
      } else if (error instanceof ApiError && error.code === 'OUT_OF_STOCK') {
        void queryClient.invalidateQueries({ queryKey: quoteKeys.all(userId) })
        void queryClient.invalidateQueries({ queryKey: cartKeys.user(userId) })
      }
    },
  })
}
