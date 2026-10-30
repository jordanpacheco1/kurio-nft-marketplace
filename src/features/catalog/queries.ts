import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { fetchNfts, type NftListParams } from '@/features/catalog/api'

export const nftKeys = {
  all: ['nfts'] as const,
  lists: () => [...nftKeys.all, 'list'] as const,
  list: (params: NftListParams) => [...nftKeys.lists(), params] as const,
}

export const nftListQuery = (params: NftListParams) =>
  queryOptions({
    queryKey: nftKeys.list(params),
    queryFn: ({ signal }) => fetchNfts(params, signal),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
