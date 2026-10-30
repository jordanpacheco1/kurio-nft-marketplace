import type { CartItem } from '@/shared/contracts'

/** A linha passou do estoque (o estoque caiu depois que o item entrou no carrinho). */
export const isShort = (item: CartItem) => item.quantity > item.available
