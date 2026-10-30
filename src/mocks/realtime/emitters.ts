import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/shared/contracts'
import { persist } from '@/mocks/db/store'
import type { OrderRecord } from '@/mocks/db/types'
import { findNft, toSummary } from '@/mocks/db/views'
import { broadcast, emitToUser } from '@/mocks/realtime/server'
import { fromWei, toWei } from '@/shared/money'

export type NftChange = {
  /** Edição alterada; o padrão é a primeira (a que o card mostra). */
  editionId?: string
  priceEth?: string
  available?: number
}

function nftEvent(nftId: string): NftUpdatedEvent {
  const nft = findNft(nftId)!
  const summary = toSummary(nft)
  return {
    eventId: crypto.randomUUID(),
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: new Date().toISOString(),
    data: {
      priceEth: summary.priceEth,
      available: summary.available,
      editions: nft.editions.map(({ id, priceEth, available, version }) => ({ id, priceEth, available, version })),
    },
  }
}

/** Grava a mudança no banco (versão +1) sem emitir. */
export function applyNftChange(nftId: string, change: NftChange) {
  const nft = findNft(nftId)
  if (!nft) throw new Error(`NFT inexistente: ${nftId}`)
  const edition = change.editionId ? nft.editions.find((item) => item.id === change.editionId) : nft.editions[0]
  if (!edition) throw new Error(`Edição inexistente: ${nftId}/${change.editionId}`)
  if (change.priceEth !== undefined) edition.priceEth = fromWei(toWei(change.priceEth)) // forma canônica
  if (change.available !== undefined) edition.available = Math.max(0, change.available)
  edition.version += 1
  nft.version += 1
  persist()
}

/** Grava no banco e emite `nft.updated`: REST e socket nunca divergem. */
export function emitNftUpdate(nftId: string, change: NftChange) {
  applyNftChange(nftId, change)
  const event = nftEvent(nftId)
  broadcast(event.type, event)
  return event
}

/**
 * Para testar o processador do cliente: aplica a mudança, emite o mesmo evento duas vezes
 * e depois uma cópia com a versão anterior e dados antigos (que precisa ser ignorada).
 */
export function emitDuplicates(nftId: string, change: NftChange) {
  const before = nftEvent(nftId)
  const event = emitNftUpdate(nftId, change)
  broadcast(event.type, event)
  const stale: NftUpdatedEvent = { ...before, eventId: crypto.randomUUID(), occurredAt: new Date().toISOString() }
  broadcast(stale.type, stale)
  return { event, stale }
}

export function emitOrderUpdate(order: OrderRecord) {
  const event: OrderUpdatedEvent = {
    eventId: crypto.randomUUID(),
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: order.updatedAt,
    userId: order.userId,
    data: { status: order.status, receipt: order.receipt, declineReason: order.declineReason },
  }
  emitToUser(order.userId, event.type, event)
  return event
}

