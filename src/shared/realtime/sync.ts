import type { Query, QueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { pushCartNotice, type CartNotice } from '@/features/cart/notices'
import { nftKeys } from '@/features/catalog/queries'
import {
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
  type Cart,
  type Favorites,
  type Featured,
  type NftDetail,
  type NftList,
  type NftSummary,
  type NftUpdatedEvent,
  type Order,
  type Quote,
  type Related,
} from '@/shared/contracts'
import { createEventProcessor } from '@/shared/realtime/processor'
import { compareEth, formatEth } from '@/shared/money'
import { announce } from '@/shared/ui/announcer'

/** Aplica o evento num resumo, se ele for mais novo que o que está no cache. */
function patchSummary<T extends NftSummary>(nft: T, event: NftUpdatedEvent, seen?: (nft: NftSummary) => void): T {
  seen?.(nft)
  if (nft.id !== event.resource.id || nft.version >= event.version) return nft
  return { ...nft, priceEth: event.data.priceEth, available: event.data.available, version: event.version }
}

function patchDetail(nft: NftDetail, event: NftUpdatedEvent): NftDetail {
  if (nft.version >= event.version) return nft
  const editions = nft.editions.map((edition) => {
    const change = event.data.editions.find((item) => item.id === edition.id)
    if (!change || change.version <= edition.version) return edition
    return { ...edition, priceEth: change.priceEth, available: change.available, version: change.version }
  })
  return { ...patchSummary(nft, event), editions }
}

const isCartQuery = (query: Query) =>
  query.queryKey[0] === 'cart' || (query.queryKey[0] === 'me' && query.queryKey[2] === 'cart')
const isQuoteQuery = (query: Query) => query.queryKey[0] === 'me' && query.queryKey[2] === 'quote'
const isPendingOrderQuery = (query: Query) =>
  query.queryKey[0] === 'me' && query.queryKey[2] === 'orders' && (query.state.data as Order | undefined)?.status === 'pending'

/** Cotação aberta com o NFT do evento (ou que falhou por estoque): o checkout cota de novo e mostra o que mudou. */
function reconcileQuotes(queryClient: QueryClient, event: NftUpdatedEvent) {
  void queryClient.invalidateQueries({
    predicate: (query) =>
      isQuoteQuery(query) &&
      (query.state.status === 'error' || !!(query.state.data as Quote | undefined)?.lines.some((line) => line.nftId === event.resource.id)),
  })
}

/**
 * Carrinho aberto com o NFT do evento: gera os avisos de preço e estoque e manda o REST recalcular
 * o carrinho e a cotação (o resumo nunca é recalculado no cliente). Devolve os avisos gerados.
 */
function reconcileCarts(queryClient: QueryClient, event: NftUpdatedEvent) {
  const notices: CartNotice[] = []
  for (const [, cart] of queryClient.getQueriesData<Cart>({ predicate: isCartQuery })) {
    for (const item of cart?.items ?? []) {
      const change = event.data.editions.find((edition) => edition.id === item.editionId)
      if (item.nftId !== event.resource.id || !change || change.version <= item.version) continue
      const label = `${item.name} (${item.editionLabel})`
      if (compareEth(item.unitPriceEth, change.priceEth) !== 0) {
        notices.push({
          id: `price:${item.id}`,
          text: `O preço de ${label} mudou de ${formatEth(item.unitPriceEth)} para ${formatEth(change.priceEth)}.`,
        })
      }
      if (change.available < item.quantity) {
        notices.push({
          id: `stock:${item.id}`,
          text:
            change.available === 0
              ? `${label} esgotou. Remova o item para continuar.`
              : `Só restam ${change.available} unidades de ${label}. Ajuste a quantidade para continuar.`,
        })
      }
    }
  }
  if (!notices.length) return notices
  notices.forEach(pushCartNotice)
  void queryClient.invalidateQueries({ predicate: isCartQuery })
  void queryClient.invalidateQueries({ predicate: isQuoteQuery })
  return notices
}

/**
 * Liga os eventos do socket ao cache do TanStack Query. Devolve a função de limpeza.
 * `getUserId` dá o usuário atual: evento privado de outra conta (sessão anterior) é descartado.
 */
export function bindRealtimeToCache(socket: Socket, queryClient: QueryClient, getUserId: () => string | null) {
  const accept = createEventProcessor()
  let disconnectedOnce = false

  const onNftUpdated = (raw: unknown) => {
    const parsed = nftUpdatedEventSchema.safeParse(raw)
    if (!parsed.success || !accept(parsed.data)) return
    const event = parsed.data
    const id = event.resource.id

    // Nome e preço anterior, de onde o NFT estiver no cache, para o anúncio.
    let before: NftSummary | undefined
    const remember = (nft: NftSummary) => {
      if (nft.id === id && !before) before = nft
    }
    const patchList = <T extends { items: NftSummary[] }>(data: T | undefined) =>
      data && { ...data, items: data.items.map((nft) => patchSummary(nft, event, remember)) }

    queryClient.setQueriesData<NftList>({ queryKey: nftKeys.lists() }, patchList)
    queryClient.setQueriesData<Related>({ queryKey: [...nftKeys.all, 'related'] }, patchList)
    queryClient.setQueriesData<Favorites>(
      { predicate: (query) => query.queryKey[0] === 'me' && query.queryKey[2] === 'favorites' },
      patchList,
    )
    queryClient.setQueryData<Featured>(nftKeys.featured(), (data) =>
      data && {
        trending: data.trending.map((nft) => patchSummary(nft, event, remember)),
        highlight: data.highlight && patchSummary(data.highlight, event, remember),
      },
    )
    queryClient.setQueryData<NftDetail>(nftKeys.detail(id), (nft) => {
      if (!nft) return nft
      remember(nft)
      return patchDetail(nft, event)
    })

    reconcileQuotes(queryClient, event)

    // O aviso do carrinho é o mais específico; ele vence o anúncio genérico do catálogo.
    const cartNotices = reconcileCarts(queryClient, event)
    if (cartNotices.length) {
      announce(cartNotices.map((notice) => notice.text).join(' '))
      return
    }

    if (!before) return
    if (compareEth(before.priceEth, event.data.priceEth) !== 0) {
      announce(`${before.name} agora custa ${formatEth(event.data.priceEth)}`)
    } else if (event.data.available === 0) {
      announce(`${before.name} esgotou`)
    } else if (before.available !== event.data.available) {
      announce(`Disponibilidade de ${before.name} atualizada`)
    }
  }

  // Pedido pendente → confirmado ou recusado. Os dois são terminais: nada depois disso muda o pedido.
  const onOrderUpdated = (raw: unknown) => {
    const parsed = orderUpdatedEventSchema.safeParse(raw)
    if (!parsed.success) return
    const event = parsed.data
    const userId = getUserId()
    if (!userId || event.userId !== userId || !accept(event)) return

    let applied = false
    queryClient.setQueryData<Order>(['me', userId, 'orders', event.resource.id], (order) => {
      if (!order || order.status !== 'pending' || order.version >= event.version) return order
      applied = true
      const { status, receipt, declineReason } = event.data
      return { ...order, status, receipt, declineReason, version: event.version, updatedAt: event.occurredAt }
    })
    if (!applied) return
    if (event.data.status === 'confirmed') announce('Pagamento confirmado. Seus NFTs estão na sua carteira.')
    else if (event.data.status === 'declined') announce(`Pagamento recusado. ${event.data.declineReason ?? ''}`.trim())
  }

  const onDisconnect = () => {
    disconnectedOnce = true
  }

  // Reconectou: reconcilia com o REST o que pode ter mudado enquanto o socket estava fora.
  const onConnect = () => {
    if (!disconnectedOnce) return
    void queryClient.invalidateQueries({ queryKey: nftKeys.all })
    void queryClient.invalidateQueries({
      predicate: (query) => isCartQuery(query) || isQuoteQuery(query) || isPendingOrderQuery(query),
    })
  }

  socket.on('nft.updated', onNftUpdated)
  socket.on('order.updated', onOrderUpdated)
  socket.on('disconnect', onDisconnect)
  socket.on('connect', onConnect)

  return () => {
    socket.off('nft.updated', onNftUpdated)
    socket.off('order.updated', onOrderUpdated)
    socket.off('disconnect', onDisconnect)
    socket.off('connect', onConnect)
    socket.disconnect()
  }
}
