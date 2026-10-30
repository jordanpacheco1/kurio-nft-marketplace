import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCurrentUser } from '@/features/auth/queries'
import { addCartItem, fetchCart } from '@/features/cart/api'
import { getGuestCartId } from '@/shared/api/credentials'
import { ApiError } from '@/shared/api/errors'
import type { AddCartItem } from '@/shared/contracts'
import { announce } from '@/shared/ui/announcer'

export const cartKeys = {
  guest: (cartId: string) => ['cart', 'guest', cartId] as const,
  user: (userId: string) => ['me', userId, 'cart'] as const,
}

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

export function useAddToCart() {
  const queryClient = useQueryClient()
  const { user } = useCurrentUser()

  return useMutation({
    mutationFn: (input: AddCartItem & { name: string }) =>
      addCartItem({ nftId: input.nftId, editionId: input.editionId, quantity: input.quantity }),
    onSuccess: (cart, input) => {
      queryClient.setQueryData(cartQuery(user?.id ?? null).queryKey, cart)
      const message = `${input.name} adicionado ao carrinho`
      toast.success(message)
      announce(message)
    },
    onError: (error) => {
      const message =
        error instanceof ApiError && (error.code === 'OUT_OF_STOCK' || error.code === 'VALIDATION_ERROR')
          ? error.message
          : 'Não foi possível adicionar ao carrinho. Tente de novo.'
      toast.error(message)
      announce(message)
    },
  })
}
