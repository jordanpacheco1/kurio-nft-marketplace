import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCurrentUser } from '@/features/auth/queries'
import { isSessionError } from '@/features/auth/session-events'
import {
  addCartItem,
  applyCoupon,
  fetchCart,
  removeCartItem,
  removeCoupon,
  updateCartItem,
} from '@/features/cart/api'
import { cartKeys } from '@/features/cart/keys'
import { getGuestCartId } from '@/shared/api/credentials'
import { ApiError } from '@/shared/api/errors'
import type { AddCartItem, Cart, CartItem } from '@/shared/contracts'
import { announce } from '@/shared/ui/announcer'

export { cartKeys }

/** Carrinho do usuário logado ou, sem sessão, o de visitante (`X-Cart-Id`). */
export const cartQuery = (userId: string | null) =>
  queryOptions({
    queryKey: userId ? cartKeys.user(userId) : cartKeys.guest(getGuestCartId()),
    queryFn: ({ signal }) => fetchCart(signal),
    staleTime: 0,
  })

export function useCart() {
  const { user, isPending } = useCurrentUser()
  return useQuery({ ...cartQuery(user?.id ?? null), enabled: !isPending })
}

/** Quantidade do carrinho para o badge do header e da tab bar. */
export function useCartCount() {
  return useCart().data?.itemCount ?? 0
}

function notify(kind: 'success' | 'error', message: string) {
  toast[kind](message)
  announce(message)
}

/** Mensagem da API quando ela explica o problema ao usuário; senão, a genérica. */
function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError && ['OUT_OF_STOCK', 'VALIDATION_ERROR', 'NOT_FOUND'].includes(error.code)
    ? error.message
    : fallback
}

/** Toda mutation do carrinho devolve o carrinho inteiro: a resposta substitui o cache, sem cálculo no cliente. */
function useCartMutation<TInput>(
  mutationFn: (input: TInput) => Promise<Cart>,
  messages: { success?: (input: TInput) => string; error: string },
) {
  const queryClient = useQueryClient()
  const { user } = useCurrentUser()
  const key = cartQuery(user?.id ?? null).queryKey

  return useMutation({
    mutationFn,
    onSuccess: (cart, input) => {
      queryClient.setQueryData(key, cart)
      const message = messages.success?.(input)
      if (message) notify('success', message)
    },
    onError: (error) => {
      if (isSessionError(error)) return // o SessionWatcher leva para o login
      notify('error', errorMessage(error, messages.error))
      // Estoque ou item mudou no servidor: busca o estado atual.
      if (error instanceof ApiError && (error.code === 'OUT_OF_STOCK' || error.code === 'NOT_FOUND')) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}

export function useAddToCart() {
  return useCartMutation(
    (input: AddCartItem & { name: string }) =>
      addCartItem({ nftId: input.nftId, editionId: input.editionId, quantity: input.quantity }),
    { success: (input) => `${input.name} adicionado ao carrinho`, error: 'Não foi possível adicionar ao carrinho. Tente de novo.' },
  )
}

export function useUpdateCartItem() {
  return useCartMutation(
    ({ item, quantity }: { item: CartItem; quantity: number }) => updateCartItem(item.id, quantity),
    {
      success: ({ item, quantity }) => `${item.name}: quantidade alterada para ${quantity}`,
      error: 'Não foi possível alterar a quantidade. Tente de novo.',
    },
  )
}

export function useRemoveCartItem() {
  return useCartMutation((item: CartItem) => removeCartItem(item.id), {
    success: (item) => `${item.name} removido do carrinho`,
    error: 'Não foi possível remover o item. Tente de novo.',
  })
}

/** Cupom: o erro de validação aparece no próprio campo, então não vira toast. */
export function useApplyCoupon() {
  const queryClient = useQueryClient()
  const { user } = useCurrentUser()
  const key = cartQuery(user?.id ?? null).queryKey

  return useMutation({
    mutationFn: (code: string) => applyCoupon(code),
    onSuccess: (cart) => {
      queryClient.setQueryData(key, cart)
      announce(`Cupom ${cart.coupon?.code} aplicado`)
    },
  })
}

export function useRemoveCoupon() {
  return useCartMutation(() => removeCoupon(), {
    success: () => 'Cupom removido',
    error: 'Não foi possível remover o cupom. Tente de novo.',
  })
}
