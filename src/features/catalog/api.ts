import { api } from '@/shared/api/client'
import { nftListSchema } from '@/shared/contracts/nft'

export type NftListParams = { page: number }

export async function fetchNfts(params: NftListParams, signal?: AbortSignal) {
  const { data } = await api.get('/nfts', { params, signal })
  return nftListSchema.parse(data)
}
