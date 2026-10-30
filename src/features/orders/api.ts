import { api } from '@/shared/api/client'
import { orderSchema, type CreateOrder } from '@/shared/contracts'

/** A mesma `Idempotency-Key` em reenvios, timeout e duplo clique devolve o mesmo pedido. */
export async function createOrder(input: CreateOrder, idempotencyKey: string) {
  const { data } = await api.post('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey } })
  return orderSchema.parse(data)
}

export async function fetchOrder(orderId: string, signal?: AbortSignal) {
  const { data } = await api.get(`/orders/${encodeURIComponent(orderId)}`, { signal })
  return orderSchema.parse(data)
}
