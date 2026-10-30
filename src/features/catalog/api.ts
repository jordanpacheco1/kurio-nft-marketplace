import { api } from '@/shared/api/client'
import { featuredSchema, nftDetailSchema, nftListSchema, relatedSchema, type NftListParams } from '@/shared/contracts'

export type { NftListParams }

export async function fetchNfts(params: NftListParams, signal?: AbortSignal) {
  const { data } = await api.get('/nfts', { params, signal })
  return nftListSchema.parse(data)
}

export async function fetchFeatured(signal?: AbortSignal) {
  const { data } = await api.get('/nfts/featured', { signal })
  return featuredSchema.parse(data)
}

export async function fetchNft(id: string, signal?: AbortSignal) {
  const { data } = await api.get(`/nfts/${encodeURIComponent(id)}`, { signal })
  return nftDetailSchema.parse(data)
}

export async function fetchRelated(id: string, signal?: AbortSignal) {
  const { data } = await api.get(`/nfts/${encodeURIComponent(id)}/related`, { signal })
  return relatedSchema.parse(data)
}
