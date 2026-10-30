import { api } from '@/shared/api/client'
import { cartSchema, type AddCartItem } from '@/shared/contracts'

export async function fetchCart(signal?: AbortSignal) {
  const { data } = await api.get('/cart', { signal })
  return cartSchema.parse(data)
}

export async function addCartItem(input: AddCartItem) {
  const { data } = await api.post('/cart/items', input)
  return cartSchema.parse(data)
}
