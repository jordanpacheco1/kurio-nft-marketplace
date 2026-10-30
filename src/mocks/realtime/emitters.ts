import { nfts } from '@/mocks/db/nfts'
import { broadcast } from '@/mocks/realtime/server'
import type { NftUpdatedEvent } from '@/shared/contracts/nft'

// Grava no banco e emite o evento: REST e socket nunca divergem.
export function emitNftUpdate(nftId: string, change: { priceEth: string }) {
  const nft = nfts.find((item) => item.id === nftId)
  if (!nft) throw new Error(`NFT inexistente: ${nftId}`)

  nft.priceEth = change.priceEth
  nft.version += 1

  const event: NftUpdatedEvent = {
    eventId: crypto.randomUUID(),
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: new Date().toISOString(),
    data: { priceEth: nft.priceEth },
  }
  broadcast(event.type, event)
  return event
}
