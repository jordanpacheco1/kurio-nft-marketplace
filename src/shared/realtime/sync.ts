import type { QueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { nftKeys } from '@/features/catalog/queries'
import {
  nftUpdatedEventSchema,
  type Favorites,
  type Featured,
  type NftDetail,
  type NftList,
  type NftSummary,
  type NftUpdatedEvent,
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

// Liga os eventos do socket ao cache do TanStack Query. Devolve a função de limpeza.
export function bindRealtimeToCache(socket: Socket, queryClient: QueryClient) {
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

    if (!before) return
    if (compareEth(before.priceEth, event.data.priceEth) !== 0) {
      announce(`${before.name} agora custa ${formatEth(event.data.priceEth)}`)
    } else if (event.data.available === 0) {
      announce(`${before.name} esgotou`)
    } else if (before.available !== event.data.available) {
      announce(`Disponibilidade de ${before.name} atualizada`)
    }
  }

  const onDisconnect = () => {
    disconnectedOnce = true
  }

  // Reconectou: reconcilia com o REST o que pode ter mudado enquanto o socket estava fora.
  const onConnect = () => {
    if (!disconnectedOnce) return
    void queryClient.invalidateQueries({ queryKey: nftKeys.all })
  }

  socket.on('nft.updated', onNftUpdated)
  socket.on('disconnect', onDisconnect)
  socket.on('connect', onConnect)

  return () => {
    socket.off('nft.updated', onNftUpdated)
    socket.off('disconnect', onDisconnect)
    socket.off('connect', onConnect)
    socket.disconnect()
  }
}
