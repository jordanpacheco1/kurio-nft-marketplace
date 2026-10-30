import { HttpResponse } from 'msw'
import {
  MAX_QUANTITY_PER_ITEM,
  addCartItemSchema,
  applyCouponSchema,
  mergeCartInputSchema,
  updateCartItemSchema,
  type Cart,
  type MergeCartResult,
} from '@/shared/contracts'
import { db } from '@/mocks/db/store'
import type { CartRecord } from '@/mocks/db/types'
import { COUPONS, findNft, toCart } from '@/mocks/db/views'
import { bearerToken, fail, readBody, requireUser, route } from '@/mocks/handlers/http'

const CART_ID = /^[A-Za-z0-9-]{8,64}$/

export function userCart(userId: string): CartRecord {
  let cart = db.carts.find((item) => item.ownerId === userId)
  if (!cart) {
    cart = { id: `cart-${userId}`, ownerId: userId, lines: [], couponCode: null }
    db.carts.push(cart)
  }
  return cart
}

/**
 * Com `Authorization`, é o carrinho do usuário. Sem, é o do visitante do header `X-Cart-Id`
 * (criado na primeira vez). Um id de carrinho de usuário nunca é aceito sem a sessão dele.
 */
function resolveCart(request: Request): CartRecord {
  if (bearerToken(request)) return userCart(requireUser(request).user.id)

  const cartId = request.headers.get('X-Cart-Id')
  let cart = cartId ? db.carts.find((item) => item.id === cartId) : undefined
  if (cart?.ownerId) fail('FORBIDDEN', 'Este carrinho pertence a outra conta.')
  if (!cartId || !CART_ID.test(cartId)) fail('VALIDATION_ERROR', 'Envie o header X-Cart-Id do carrinho de visitante.')
  if (!cart) {
    cart = { id: cartId, ownerId: null, lines: [], couponCode: null }
    db.carts.push(cart)
  }
  return cart
}

function requireEdition(nftId: string, editionId: string) {
  const nft = findNft(nftId)
  const edition = nft?.editions.find((item) => item.id === editionId)
  if (!nft || !edition) fail('NOT_FOUND', 'Esta edição não existe.')
  return { nft, edition }
}

/** Quantidade aceita: até o estoque da edição e até o limite por item. */
function assertQuantity(nftId: string, editionId: string, quantity: number) {
  const { nft, edition } = requireEdition(nftId, editionId)
  if (quantity > MAX_QUANTITY_PER_ITEM) {
    fail('VALIDATION_ERROR', `O limite é de ${MAX_QUANTITY_PER_ITEM} unidades por edição.`, {
      fields: { quantity: `Máximo de ${MAX_QUANTITY_PER_ITEM}` },
    })
  }
  if (quantity > edition.available) {
    fail(
      'OUT_OF_STOCK',
      edition.available === 0
        ? `A edição ${edition.label} de ${nft.name} esgotou.`
        : `Só restam ${edition.available} unidades da edição ${edition.label} de ${nft.name}.`,
    )
  }
}

function findLine(cart: CartRecord, itemId: string) {
  const line = cart.lines.find((item) => `${item.nftId}:${item.editionId}` === itemId)
  if (!line) fail('NOT_FOUND', 'Este item não está no carrinho.')
  return line
}

const cartResponse = (cart: CartRecord, status = 200) => HttpResponse.json<Cart>(toCart(cart), { status })

export const cartHandlers = [
  route('get', '/cart', ({ request }) => cartResponse(resolveCart(request))),

  route('post', '/cart/items', async ({ request }) => {
    const cart = resolveCart(request)
    const input = await readBody(request, addCartItemSchema)
    const line = cart.lines.find((item) => item.nftId === input.nftId && item.editionId === input.editionId)
    const quantity = (line?.quantity ?? 0) + input.quantity
    assertQuantity(input.nftId, input.editionId, quantity)
    if (line) line.quantity = quantity
    else cart.lines.push({ nftId: input.nftId, editionId: input.editionId, quantity })
    return cartResponse(cart, line ? 200 : 201)
  }),

  route('patch', '/cart/items/:itemId', async ({ request, params }) => {
    const cart = resolveCart(request)
    const line = findLine(cart, params.itemId!)
    const { quantity } = await readBody(request, updateCartItemSchema)
    // Diminuir é sempre permitido (é como o usuário resolve um estoque que caiu).
    if (quantity > line.quantity) assertQuantity(line.nftId, line.editionId, quantity)
    line.quantity = quantity
    return cartResponse(cart)
  }),

  route('delete', '/cart/items/:itemId', ({ request, params }) => {
    const cart = resolveCart(request)
    const line = findLine(cart, params.itemId!)
    cart.lines = cart.lines.filter((item) => item !== line)
    if (!cart.lines.length) cart.couponCode = null
    return cartResponse(cart)
  }),

  route('put', '/cart/coupon', async ({ request }) => {
    const cart = resolveCart(request)
    const code = (await readBody(request, applyCouponSchema)).code.toUpperCase()
    const coupon = COUPONS[code]
    if (!coupon) fail('VALIDATION_ERROR', 'Cupom inválido.', { fields: { code: 'Cupom inválido' } })
    if (coupon.expired) fail('VALIDATION_ERROR', 'Este cupom expirou.', { fields: { code: 'Este cupom expirou' } })
    if (!cart.lines.length) fail('VALIDATION_ERROR', 'Adicione um NFT antes de aplicar o cupom.', { fields: { code: 'Carrinho vazio' } })
    cart.couponCode = code
    return cartResponse(cart)
  }),

  route('delete', '/cart/coupon', ({ request }) => {
    const cart = resolveCart(request)
    cart.couponCode = null
    return cartResponse(cart)
  }),

  // No login, junta o carrinho do visitante ao do usuário, respeitando estoque e o limite por item.
  route('post', '/cart/merge', async ({ request }) => {
    const { user } = requireUser(request)
    const { guestCartId } = await readBody(request, mergeCartInputSchema)
    const cart = userCart(user.id)
    const guest = db.carts.find((item) => item.id === guestCartId && item.ownerId === null)
    const adjustments: MergeCartResult['adjustments'] = []

    for (const guestLine of guest?.lines ?? []) {
      const edition = findNft(guestLine.nftId)?.editions.find((item) => item.id === guestLine.editionId)
      if (!edition) continue
      const line = cart.lines.find((item) => item.nftId === guestLine.nftId && item.editionId === guestLine.editionId)
      const requested = (line?.quantity ?? 0) + guestLine.quantity
      const applied = Math.min(requested, edition.available, MAX_QUANTITY_PER_ITEM)
      const itemId = `${guestLine.nftId}:${guestLine.editionId}`
      if (applied < requested) adjustments.push({ itemId, requested, applied })
      if (applied <= 0) {
        if (line) cart.lines = cart.lines.filter((item) => item !== line)
        continue
      }
      if (line) line.quantity = applied
      else cart.lines.push({ ...guestLine, quantity: applied })
    }
    if (guest) {
      cart.couponCode ??= guest.couponCode
      db.carts = db.carts.filter((item) => item !== guest)
    }
    return HttpResponse.json<MergeCartResult>({ cart: toCart(cart), adjustments })
  }),
]
