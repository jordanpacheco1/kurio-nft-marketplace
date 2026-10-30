import type { QueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { nftKeys } from '@/features/catalog/queries'
import { nftUpdatedEventSchema, type NftList } from '@/shared/contracts/nft'
import { createEventProcessor } from '@/shared/realtime/processor'
import { announce } from '@/shared/ui/announcer'

// Liga os eventos do socket ao cache do TanStack Query. Devolve a função de limpeza.
export function bindRealtimeToCache(socket: Socket, queryClient: QueryClient) {
  const accept = createEventProcessor()
  let disconnectedOnce = false

  const onNftUpdated = (raw: unknown) => {
    const parsed = nftUpdatedEventSchema.safeParse(raw)
    if (!parsed.success || !accept(parsed.data)) return
    const event = parsed.data
    let name: string | undefined

    queryClient.setQueriesData<NftList>({ queryKey: nftKeys.lists() }, (list) => {
      if (!list) return list
      return {
        ...list,
        items: list.items.map((nft) => {
          if (nft.id !== event.resource.id || nft.version >= event.version) return nft
          name = nft.name
          return { ...nft, priceEth: event.data.priceEth, version: event.version }
        }),
      }
    })
    if (name) announce(`${name} agora custa ${event.data.priceEth} ETH`)
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
