import type { Network, Receipt } from '@/shared/contracts'
import { db, persist } from '@/mocks/db/store'
import type { OrderRecord } from '@/mocks/db/types'
import { findNft } from '@/mocks/db/views'
import { userCart } from '@/mocks/handlers/cart'
import { emitNftUpdate, emitOrderUpdate } from '@/mocks/realtime/emitters'
import { prng } from '@/mocks/scenarios/registry'

// Processamento simulado do pagamento: o pedido nasce `pending` e termina `confirmed` ou `declined`.
// O estado vive no banco (com `settleAt`), então um refresh no meio não perde o pedido.

export const SETTLE_DELAY_MS = 2000

const EXPLORER: Record<Network, string> = {
  ethereum: 'https://etherscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  solana: 'https://solscan.io/tx/',
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()

export function scheduleSettlement(order: OrderRecord) {
  clearTimeout(timers.get(order.id))
  const wait = Math.max(0, Date.parse(order.settleAt) - Date.now())
  timers.set(
    order.id,
    setTimeout(() => settleOrder(order.id), wait),
  )
}

/** No boot dos mocks: retoma os pedidos que estavam pendentes antes do refresh. */
export function resumePendingOrders() {
  for (const order of db.orders) if (order.status === 'pending') scheduleSettlement(order)
}

export function clearSettlements() {
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
}

function decline(order: OrderRecord, reason: string) {
  order.status = 'declined'
  order.declineReason = reason
}

function confirm(order: OrderRecord) {
  const wallet = db.wallets.find((item) => item.id === order.walletId)!
  for (const line of order.quote.lines) {
    const edition = findNft(line.nftId)!.editions.find((item) => item.id === line.editionId)!
    emitNftUpdate(line.nftId, { editionId: line.editionId, available: edition.available - line.quantity })
  }

  // Tira do carrinho só o que foi comprado, na quantidade comprada.
  const cart = userCart(order.userId)
  for (const line of order.quote.lines) {
    const cartLine = cart.lines.find((item) => item.nftId === line.nftId && item.editionId === line.editionId)
    if (cartLine) cartLine.quantity -= line.quantity
  }
  cart.lines = cart.lines.filter((item) => item.quantity > 0)
  if (order.quote.coupon || !cart.lines.length) cart.couponCode = null

  const transactionHash = `0x${prng().hex(64)}`
  const receipt: Receipt = {
    transactionHash,
    explorerUrl: `${EXPLORER[order.network]}${transactionHash}`,
    confirmedAt: new Date().toISOString(),
    network: order.network,
    wallet: { label: wallet.label, address: wallet.address, provider: wallet.provider },
    lines: order.quote.lines.map((line) => ({
      nftId: line.nftId,
      editionId: line.editionId,
      name: line.name,
      tokenId: line.tokenId,
      image: line.image,
      editionLabel: line.editionLabel,
      quantity: line.quantity,
      unitPriceEth: line.unitPriceEth,
      lineTotalEth: line.lineTotalEth,
    })),
    subtotalEth: order.quote.subtotalEth,
    discountEth: order.quote.discountEth,
    networkFeeEth: order.quote.networkFeeEth,
    totalEth: order.quote.totalEth,
    coupon: order.quote.coupon,
  }
  order.status = 'confirmed'
  order.receipt = receipt
}

/** Fecha o pedido (idempotente: pedido terminal não muda mais) e avisa o dono pelo socket. */
export function settleOrder(orderId: string) {
  timers.delete(orderId)
  const order = db.orders.find((item) => item.id === orderId)
  if (!order || order.status !== 'pending') return order

  const missing = order.quote.lines.find((line) => {
    const edition = findNft(line.nftId)?.editions.find((item) => item.id === line.editionId)
    return !edition || edition.available < line.quantity
  })
  if (order.willDecline) decline(order, 'O pagamento foi recusado pela carteira.')
  else if (missing) decline(order, `A edição ${missing.editionLabel} de ${missing.name} esgotou antes da confirmação.`)
  else confirm(order)

  order.version += 1
  order.updatedAt = new Date().toISOString()
  persist()
  emitOrderUpdate(order)
  return order
}

/** Usado no `GET /orders/:id`: se o timer se perdeu (aba fechada), fecha o pedido na leitura. */
export function settleIfDue(order: OrderRecord) {
  if (order.status === 'pending' && Date.parse(order.settleAt) <= Date.now()) settleOrder(order.id)
}
