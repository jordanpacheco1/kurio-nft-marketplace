import { z } from 'zod'
import {
  collectionSchema,
  networkSchema,
  NFT_PAGE_SIZE,
  nftSortSchema,
  nftTabSchema,
  type NftListParams,
} from '@/shared/contracts'

// Search params da home. Valor inválido na URL cai no padrão em vez de quebrar a página.
// `min` e `max` ficam como número na URL (`?min=0.5`); a API recebe string decimal.
export const homeSearchSchema = z.object({
  q: z.string().trim().max(80).default('').catch(''),
  collections: z.array(collectionSchema).default([]).catch([]),
  networks: z.array(networkSchema).default([]).catch([]),
  min: z.number().min(0).optional().catch(undefined),
  max: z.number().min(0).optional().catch(undefined),
  sort: nftSortSchema.default('recent').catch('recent'),
  tab: nftTabSchema.default('all').catch('all'),
  page: z.number().int().min(1).default(1).catch(1),
})

export type HomeSearch = z.infer<typeof homeSearchSchema>

/** Valores que saem da URL (`stripSearchParams`). */
export const HOME_SEARCH_DEFAULTS = {
  q: '',
  collections: [],
  networks: [],
  sort: 'recent',
  tab: 'all',
  page: 1,
} satisfies Partial<HomeSearch>

const eth = (value: number | undefined) => (value === undefined ? undefined : String(Number(value.toFixed(2))))

export function toListParams(search: HomeSearch): NftListParams {
  return {
    q: search.q || undefined,
    collections: search.collections.length ? search.collections : undefined,
    networks: search.networks.length ? search.networks : undefined,
    min: eth(search.min),
    max: eth(search.max),
    sort: search.sort === 'recent' ? undefined : search.sort,
    tab: search.tab === 'all' ? undefined : search.tab,
    page: search.page,
    pageSize: NFT_PAGE_SIZE,
  }
}

export const SORT_LABELS = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  name: 'Nome (A–Z)',
} as const

export const TAB_LABELS = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
} as const
