import { delay, HttpResponse } from 'msw'
import {
  createOrderSchema,
  quoteInputSchema,
  type ApiErrorBody,
  type Network,
  type Order,
  type Quote,
} from '@/shared/contracts'
import { addEth, percentOf } from '@/shared/money'
import { db, persist } from '@/mocks/db/store'
import type { OrderRecord, QuoteRecord } from '@/mocks/db/types'
import { cartItems, couponFor, findNft, totals } from '@/mocks/db/views'
import { userCart } from '@/mocks/handlers/cart'
import { apiError, fail, readBody, requireUser, route } from '@/mocks/handlers/http'
import { emitNftUpdate } from '@/mocks/realtime/emitters'
import { scheduleSettlement, SETTLE_DELAY_MS, settleIfDue } from '@/mocks/realtime/orders'
import { isScenarioActive } from '@/mocks/scenarios/registry'

const QUOTE_TTL_MS = 5 * 60_000
const PRICE_CHANGE_DELAY_MS = 1500
const ORDER_TIMEOUT_DELAY_MS = 12_000 // passa dos 10 s do cliente

function toQuote(record: QuoteRecord): Quote {
  return {
    quoteId: record.quoteId,
    network: record.network,
    lines: record.lines,
    subtotalEth: record.subtotalEth,
    discountEth: record.discountEth,
    networkFeeEth: record.networkFeeEth,
    totalEth: record.totalEth,
    coupon: record.coupon,
    expiresAt: record.expiresAt,
  }
}

/** Cotação a partir do carrinho atual do usuário. Falha com carrinho vazio ou item acima do estoque. */
function createQuote(userId: string, network: Network): QuoteRecord {
  const cart = userCart(userId)
  const items = cartItems(cart)
  if (!items.length) fail('VALIDATION_ERROR', 'Seu carrinho está vazio.')
  const short = items.find((item) => item.quantity > item.available)
  if (short) {
    fail(
      'OUT_OF_STOCK',
      short.available === 0
        ? `A edição ${short.editionLabel} de ${short.name} esgotou. Remova o item para continuar.`
        : `Só restam ${short.available} unidades da edição ${short.editionLabel} de ${short.name}.`,
    )
  }

  const coupon = couponFor(cart.couponCode)
  const record: QuoteRecord = {
    quoteId: `q-${crypto.randomUUID()}`,
    userId,
    network,
    lines: items.map((item) => ({
      itemId: item.id,
      nftId: item.nftId,
      editionId: item.editionId,
      name: item.name,
      tokenId: item.tokenId,
      image: item.image,
      editionLabel: item.editionLabel,
      quantity: item.quantity,
      unitPriceEth: item.unitPriceEth,
      lineTotalEth: item.lineTotalEth,
      version: item.version,
    })),
    ...totals(
      items.map((item) => item.lineTotalEth),
      coupon,
      network,
    ),
    coupon,
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
    consumedBy: null,
  }
  db.quotes = [...db.quotes.filter((quote) => quote.userId !== userId || quote.consumedBy), record]
  return record
}

/** Cenário price-change: na primeira cotação, o preço do primeiro item sobe 15% logo depois. */
function maybeRaisePrice(quote: QuoteRecord) {
  if (!isScenarioActive('price-change') || db.flags.priceChangeFired) return
  db.flags.priceChangeFired = true
  const [line] = quote.lines
  setTimeout(() => {
    const edition = findNft(line!.nftId)?.editions.find((item) => item.id === line!.editionId)
    if (edition) emitNftUpdate(line!.nftId, { editionId: edition.id, priceEth: addEth(edition.priceEth, percentOf(edition.priceEth, 15)) })
  }, PRICE_CHANGE_DELAY_MS)
}

/** Cenário sold-out: na primeira tentativa de pedido, a edição do primeiro item esgota. */
function maybeSellOut(quote: QuoteRecord) {
  if (!isScenarioActive('sold-out') || db.flags.soldOutFired) return
  db.flags.soldOutFired = true
  const [line] = quote.lines
  emitNftUpdate(line!.nftId, { editionId: line!.editionId, available: 0 })
}

/** A cotação ainda vale? Mesmo carrinho, mesmas versões de edição, mesmo cupom, dentro do prazo e sem uso. */
function isQuoteCurrent(quote: QuoteRecord, network: Network) {
  const cart = userCart(quote.userId)
  const items = cartItems(cart)
  if (quote.consumedBy || quote.network !== network || Date.parse(quote.expiresAt) <= Date.now()) return false
  if (items.length !== quote.lines.length || couponFor(cart.couponCode)?.code !== quote.coupon?.code) return false
  return quote.lines.every((line) => {
    const item = items.find((candidate) => candidate.id === line.itemId)
    return item && item.quantity === line.quantity && item.version === line.version
  })
}

function staleResponse(userId: string, network: Network) {
  let quote: Quote | undefined
  try {
    quote = toQuote(createQuote(userId, network))
  } catch (error) {
    if (error instanceof Response) return error // sem como cotar de novo (estoque, carrinho vazio)
    throw error
  }
  const extra: Omit<ApiErrorBody['error'], 'code' | 'message'> = { quote }
  return apiError('QUOTE_STALE', 'Os valores mudaram desde a última cotação. Revise e confirme de novo.', extra)
}

function toOrder(record: OrderRecord): Order {
  return {
    id: record.id,
    status: record.status,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    network: record.network,
    itemCount: record.itemCount,
    totalEth: record.totalEth,
    receipt: record.receipt,
    declineReason: record.declineReason,
  }
}

export const checkoutHandlers = [
  route('post', '/quotes', async ({ request }) => {
    const { user } = requireUser(request)
    const { network } = await readBody(request, quoteInputSchema)
    const quote = createQuote(user.id, network)
    maybeRaisePrice(quote)
    return HttpResponse.json<Quote>(toQuote(quote), { status: 201 })
  }),

  route('post', '/orders', async ({ request }) => {
    const { user } = requireUser(request)
    const key = request.headers.get('Idempotency-Key')
    if (!key || key.length < 8) fail('VALIDATION_ERROR', 'Envie o header Idempotency-Key.')
    const input = await readBody(request, createOrderSchema)
    const bodyHash = JSON.stringify(input)

    // Mesma chave + mesmo corpo devolve o mesmo pedido; corpo diferente é conflito.
    const previous = db.idempotency[`${user.id}:${key}`]
    if (previous) {
      if (previous.bodyHash !== bodyHash) {
        fail('IDEMPOTENCY_CONFLICT', 'Esta tentativa de compra já foi usada com outros dados.')
      }
      const order = db.orders.find((item) => item.id === previous.orderId)!
      settleIfDue(order)
      return HttpResponse.json<Order>(toOrder(order))
    }

    const wallet = db.wallets.find((item) => item.id === input.walletId && item.userId === user.id)
    if (!wallet) fail('VALIDATION_ERROR', 'Escolha uma das suas carteiras.', { fields: { walletId: 'Carteira inválida' } })
    if (!db.walletSessions.some((item) => item.walletId === wallet.id && item.userId === user.id)) {
      fail('VALIDATION_ERROR', 'Conecte a carteira antes de confirmar.', { fields: { walletId: 'Carteira desconectada' } })
    }

    const quote = db.quotes.find((item) => item.quoteId === input.quoteId && item.userId === user.id)
    if (!quote) return staleResponse(user.id, input.network)

    maybeSellOut(quote)
    const short = quote.lines.find((line) => {
      const edition = findNft(line.nftId)?.editions.find((item) => item.id === line.editionId)
      return !edition || edition.available < line.quantity
    })
    if (short) fail('OUT_OF_STOCK', `A edição ${short.editionLabel} de ${short.name} não tem mais unidades suficientes.`)
    if (!isQuoteCurrent(quote, input.network)) return staleResponse(user.id, input.network)

    const now = new Date()
    const order: OrderRecord = {
      id: `ord-${crypto.randomUUID().slice(0, 8)}`,
      status: 'pending',
      version: 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      network: input.network,
      itemCount: quote.lines.reduce((sum, line) => sum + line.quantity, 0),
      totalEth: quote.totalEth,
      receipt: null,
      declineReason: null,
      userId: user.id,
      quoteId: quote.quoteId,
      walletId: wallet.id,
      collector: input.collector,
      settleAt: new Date(now.getTime() + SETTLE_DELAY_MS).toISOString(),
      willDecline: isScenarioActive('payment-declined'),
      quote: toQuote(quote),
    }
    quote.consumedBy = order.id
    db.orders.push(order)
    db.idempotency[`${user.id}:${key}`] = { orderId: order.id, bodyHash }
    scheduleSettlement(order)

    // Cenário order-timeout: o pedido já existe, mas a primeira resposta chega depois do timeout do cliente.
    if (isScenarioActive('order-timeout') && !db.flags.orderTimeoutFired) {
      db.flags.orderTimeoutFired = true
      persist()
      await delay(ORDER_TIMEOUT_DELAY_MS)
    }
    return HttpResponse.json<Order>(toOrder(order), { status: 201 })
  }),

  route('get', '/orders/:id', ({ request, params }) => {
    const { user } = requireUser(request)
    const order = db.orders.find((item) => item.id === params.id)
    if (!order) fail('NOT_FOUND', 'Pedido não encontrado.')
    if (order.userId !== user.id) fail('FORBIDDEN', 'Este pedido pertence a outra conta.')
    settleIfDue(order)
    return HttpResponse.json<Order>(toOrder(order))
  }),
]
