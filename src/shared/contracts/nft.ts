import { z } from 'zod'

// Versão mínima da Fase 1. Os contratos completos entram na Fase 2.
export const nftSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  collection: z.string(),
  image: z.string(),
  priceEth: z.string(),
  version: z.number().int(),
})
export type NftSummary = z.infer<typeof nftSummarySchema>

export const nftListSchema = z.object({
  items: z.array(nftSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
})
export type NftList = z.infer<typeof nftListSchema>

export const nftUpdatedEventSchema = z.object({
  eventId: z.string(),
  type: z.literal('nft.updated'),
  resource: z.object({ type: z.literal('nft'), id: z.string() }),
  version: z.number().int(),
  occurredAt: z.string(),
  data: z.object({ priceEth: z.string() }),
})
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>
