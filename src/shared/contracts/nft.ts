import { z } from 'zod'
import { collectionSchema, ethSchema, isoDateSchema, networkSchema, paginated } from './common'

export const editionLabelSchema = z.enum(['1/1', '1/10', '1/50', 'Aberta'])
export type EditionLabel = z.infer<typeof editionLabelSchema>

export const editionSchema = z.object({
  id: z.string(),
  label: editionLabelSchema,
  /** `null` na edição aberta (sem tiragem fixa). */
  supply: z.number().int().positive().nullable(),
  available: z.number().int().min(0),
  priceEth: ethSchema,
  version: z.number().int().positive(),
})
export type Edition = z.infer<typeof editionSchema>

export const nftImageSchema = z.enum(['ape-emerald', 'ape-nomad', 'ape-golden', 'ape-ivory'])
export type NftImage = z.infer<typeof nftImageSchema>

export const nftSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  tokenId: z.string(),
  collection: collectionSchema,
  network: networkSchema,
  image: nftImageSchema,
  /** Preço da edição padrão (a primeira da lista). É o que o card mostra e o que filtros e ordenação usam. */
  priceEth: ethSchema,
  /** Unidades disponíveis somando todas as edições. */
  available: z.number().int().min(0),
  rare: z.boolean(),
  listedAt: isoDateSchema,
  version: z.number().int().positive(),
})
export type NftSummary = z.infer<typeof nftSummarySchema>

export const nftDetailSchema = nftSummarySchema.extend({
  description: z.string(),
  /** Série do criador (ex.: Kurio Apes). "Mais desta coleção" usa a série. */
  series: z.string(),
  creator: z.string(),
  attributes: z.array(z.object({ trait: z.string(), value: z.string() })),
  rating: z.object({ average: z.number().min(0).max(5), count: z.number().int().min(0) }),
  gallery: z.array(nftImageSchema).min(1),
  editions: z.array(editionSchema).min(1),
})
export type NftDetail = z.infer<typeof nftDetailSchema>

// ----- Listagem -----

export const nftSortSchema = z.enum(['recent', 'price-asc', 'price-desc', 'name'])
export type NftSort = z.infer<typeof nftSortSchema>

export const nftTabSchema = z.enum(['all', 'new', 'trending'])
export type NftTab = z.infer<typeof nftTabSchema>

export const NFT_PAGE_SIZE = 9

/** Params de `GET /nfts`. Os arrays vão repetidos na query string (`collections=a&collections=b`). */
export const nftListParamsSchema = z.object({
  q: z.string().trim().max(80).optional(),
  collections: z.array(collectionSchema).optional(),
  networks: z.array(networkSchema).optional(),
  min: ethSchema.optional(),
  max: ethSchema.optional(),
  sort: nftSortSchema.optional(),
  tab: nftTabSchema.optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(48).optional(),
})
export type NftListParams = z.infer<typeof nftListParamsSchema>

const facetSchema = <T extends z.ZodType>(id: T) =>
  z.object({ id, label: z.string(), count: z.number().int().min(0) })

export const nftListSchema = paginated(nftSummarySchema).extend({
  /** Contagens de cada filtro considerando os demais filtros aplicados. */
  facets: z.object({
    collections: z.array(facetSchema(collectionSchema)),
    networks: z.array(facetSchema(networkSchema)),
    price: z.object({ min: ethSchema, max: ethSchema }),
  }),
})
export type NftList = z.infer<typeof nftListSchema>

export const featuredSchema = z.object({
  /** Card "NFT em destaque / Oferta limitada". `null` com o catálogo vazio. */
  highlight: nftSummarySchema.extend({ offerEndsAt: isoDateSchema }).nullable(),
  /** Aba "Em alta". */
  trending: z.array(nftSummarySchema),
})
export type Featured = z.infer<typeof featuredSchema>

export const relatedSchema = z.object({ items: z.array(nftSummarySchema) })
export type Related = z.infer<typeof relatedSchema>

// ----- Favoritos -----

export const favoritesSchema = z.object({ items: z.array(nftSummarySchema) })
export type Favorites = z.infer<typeof favoritesSchema>

export const favoriteToggleSchema = z.object({ nftId: z.string(), favorited: z.boolean() })
export type FavoriteToggle = z.infer<typeof favoriteToggleSchema>
