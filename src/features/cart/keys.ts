// Fora do queries.ts para a sessão (login, logout e merge) usar sem import circular.
export const cartKeys = {
  guests: () => ['cart', 'guest'] as const,
  guest: (cartId: string) => ['cart', 'guest', cartId] as const,
  user: (userId: string) => ['me', userId, 'cart'] as const,
}
