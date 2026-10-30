import { api } from '@/shared/api/client'
import { quoteSchema, type Network } from '@/shared/contracts'

/** Cotação do carrinho atual na rede escolhida. Cada chamada gera uma cotação nova (a anterior perde a validade). */
export async function createQuote(network: Network, signal?: AbortSignal) {
  const { data } = await api.post('/quotes', { network }, { signal })
  return quoteSchema.parse(data)
}
