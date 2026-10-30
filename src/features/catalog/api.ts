import { api } from '@/shared/api/client'
import { nftListSchema, type NftListParams } from '@/shared/contracts'

export type { NftListParams }

export async function fetchNfts(params: NftListParams, signal?: AbortSignal) {
  const { data } = await api.get('/nfts', { params, signal })
  return nftListSchema.parse(data)
}
