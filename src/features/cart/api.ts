import { api } from '@/shared/api/client'
import { cartSchema, mergeCartResultSchema, type AddCartItem } from '@/shared/contracts'

export async function fetchCart(signal?: AbortSignal) {
  const { data } = await api.get('/cart', { signal })
  return cartSchema.parse(data)
}

export async function addCartItem(input: AddCartItem) {
  const { data } = await api.post('/cart/items', input)
  return cartSchema.parse(data)
}

export async function updateCartItem(itemId: string, quantity: number) {
  const { data } = await api.patch(`/cart/items/${encodeURIComponent(itemId)}`, { quantity })
  return cartSchema.parse(data)
}

export async function removeCartItem(itemId: string) {
  const { data } = await api.delete(`/cart/items/${encodeURIComponent(itemId)}`)
  return cartSchema.parse(data)
}

export async function applyCoupon(code: string) {
  const { data } = await api.put('/cart/coupon', { code })
  return cartSchema.parse(data)
}

export async function removeCoupon() {
  const { data } = await api.delete('/cart/coupon')
  return cartSchema.parse(data)
}

/** Junta o carrinho do visitante ao do usuário recém-autenticado (o token ainda não foi publicado). */
export async function mergeCart(guestCartId: string, token: string) {
  const { data } = await api.post('/cart/merge', { guestCartId }, { headers: { Authorization: `Bearer ${token}` } })
  return mergeCartResultSchema.parse(data)
}
