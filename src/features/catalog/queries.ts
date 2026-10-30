import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { fetchFeatured, fetchNft, fetchNfts, fetchRelated, type NftListParams } from '@/features/catalog/api'
import { ApiError } from '@/shared/api/errors'

export const nftKeys = {
  all: ['nfts'] as const,
  lists: () => [...nftKeys.all, 'list'] as const,
  list: (params: NftListParams) => [...nftKeys.lists(), params] as const,
  featured: () => [...nftKeys.all, 'featured'] as const,
  details: () => [...nftKeys.all, 'detail'] as const,
  detail: (id: string) => [...nftKeys.details(), id] as const,
  related: (id: string) => [...nftKeys.all, 'related', id] as const,
}

export const nftListQuery = (params: NftListParams) =>
  queryOptions({
    queryKey: nftKeys.list(params),
    queryFn: ({ signal }) => fetchNfts(params, signal),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

export const featuredQuery = () =>
  queryOptions({
    queryKey: nftKeys.featured(),
    queryFn: ({ signal }) => fetchFeatured(signal),
    staleTime: 30_000,
  })

export const nftDetailQuery = (id: string) =>
  queryOptions({
    queryKey: nftKeys.detail(id),
    queryFn: ({ signal }) => fetchNft(id, signal),
    staleTime: 15_000,
  })

export const relatedQuery = (id: string) =>
  queryOptions({
    queryKey: nftKeys.related(id),
    queryFn: ({ signal }) => fetchRelated(id, signal),
    staleTime: 30_000,
  })

export const isNotFound = (error: unknown) => error instanceof ApiError && error.code === 'NOT_FOUND'
