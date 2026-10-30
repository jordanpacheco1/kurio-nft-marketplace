import { HttpResponse } from 'msw'
import {
  COLLECTION_LABELS,
  NETWORK_LABELS,
  NFT_PAGE_SIZE,
  nftListParamsSchema,
  type Collection,
  type Featured,
  type Favorites,
  type FavoriteToggle,
  type Network,
  type NftDetail,
  type NftList,
  type NftListParams,
  type Related,
} from '@/shared/contracts'
import { compareEth } from '@/shared/money'
import { db } from '@/mocks/db/store'
import type { NftRecord } from '@/mocks/db/types'
import { findNft, toDetail, toSummary } from '@/mocks/db/views'
import { fail, parse, requireUser, route } from '@/mocks/handlers/http'
import { isScenarioActive } from '@/mocks/scenarios/registry'

const NEW_WINDOW_MS = 10 * 86_400_000 // "Novos lançamentos": até 10 dias antes do mais recente
const TRENDING_MIN_SCORE = 70

const catalog = () => (isScenarioActive('empty') ? [] : db.nfts)
const price = (nft: NftRecord) => nft.editions[0]!.priceEth

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

function readParams(url: URL): NftListParams {
  const sp = url.searchParams
  const number = (key: string) => (sp.has(key) ? Number(sp.get(key)) : undefined)
  const list = (key: string) => (sp.has(key) ? sp.getAll(key).flatMap((value) => value.split(',')) : undefined)
  return parse(nftListParamsSchema, {
    q: sp.get('q') ?? undefined,
    collections: list('collections'),
    networks: list('networks'),
    min: sp.get('min') ?? undefined,
    max: sp.get('max') ?? undefined,
    sort: sp.get('sort') ?? undefined,
    tab: sp.get('tab') ?? undefined,
    page: number('page'),
    pageSize: number('pageSize'),
  })
}

type Filter = (nft: NftRecord) => boolean

function buildFilters(params: NftListParams, items: NftRecord[]) {
  const newest = Math.max(0, ...items.map((nft) => Date.parse(nft.listedAt)))
  const q = params.q ? normalize(params.q) : ''

  const base: Filter[] = []
  if (q) {
    base.push((nft) =>
      [nft.name, nft.tokenId, nft.series, COLLECTION_LABELS[nft.collection]].some((text) => normalize(text).includes(q)),
    )
  }
  if (params.min) base.push((nft) => compareEth(price(nft), params.min!) >= 0)
  if (params.max) base.push((nft) => compareEth(price(nft), params.max!) <= 0)
  if (params.tab === 'new') base.push((nft) => newest - Date.parse(nft.listedAt) <= NEW_WINDOW_MS)
  if (params.tab === 'trending') base.push((nft) => nft.trendingScore >= TRENDING_MIN_SCORE)

  const byCollection: Filter = (nft) => !params.collections?.length || params.collections.includes(nft.collection)
  const byNetwork: Filter = (nft) => !params.networks?.length || params.networks.includes(nft.network)
  const all = (filters: Filter[]) => (nft: NftRecord) => filters.every((filter) => filter(nft))

  return {
    matches: all([...base, byCollection, byNetwork]),
    // Cada faceta conta com os outros filtros aplicados, menos o dela.
    forCollectionFacet: all([...base, byNetwork]),
    forNetworkFacet: all([...base, byCollection]),
  }
}

function sortItems(items: NftRecord[], params: NftListParams) {
  const sorted = [...items]
  const byId = (a: NftRecord, b: NftRecord) => a.id.localeCompare(b.id)
  switch (params.sort ?? (params.tab === 'trending' ? undefined : 'recent')) {
    case 'price-asc':
      return sorted.sort((a, b) => compareEth(price(a), price(b)) || byId(a, b))
    case 'price-desc':
      return sorted.sort((a, b) => compareEth(price(b), price(a)) || byId(a, b))
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || byId(a, b))
    case 'recent':
      return sorted.sort((a, b) => b.listedAt.localeCompare(a.listedAt) || byId(a, b))
    default: // aba "Em alta" sem ordenação explícita: por popularidade
      return sorted.sort((a, b) => b.trendingScore - a.trendingScore || byId(a, b))
  }
}

function priceRange(items: NftRecord[]) {
  if (!items.length) return { min: '0', max: '0' }
  const prices = items.map(price).sort(compareEth)
  return { min: prices[0]!, max: prices[prices.length - 1]! }
}

function requireNft(id: string) {
  const nft = isScenarioActive('empty') ? undefined : findNft(id)
  if (!nft) fail('NOT_FOUND', 'Não encontramos este NFT.')
  return nft
}

export const nftHandlers = [
  route('get', '/nfts', ({ request }) => {
    const params = readParams(new URL(request.url))
    const items = catalog()
    const { matches, forCollectionFacet, forNetworkFacet } = buildFilters(params, items)
    const filtered = sortItems(items.filter(matches), params)

    const page = params.page ?? 1
    const pageSize = params.pageSize ?? NFT_PAGE_SIZE
    const count = <T extends string>(filter: Filter, key: (nft: NftRecord) => T, id: T) =>
      items.filter((nft) => filter(nft) && key(nft) === id).length

    return HttpResponse.json<NftList>({
      items: filtered.slice((page - 1) * pageSize, page * pageSize).map(toSummary),
      page,
      pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      facets: {
        collections: (Object.keys(COLLECTION_LABELS) as Collection[]).map((id) => ({
          id,
          label: COLLECTION_LABELS[id],
          count: count(forCollectionFacet, (nft) => nft.collection, id),
        })),
        networks: (Object.keys(NETWORK_LABELS) as Network[]).map((id) => ({
          id,
          label: NETWORK_LABELS[id],
          count: count(forNetworkFacet, (nft) => nft.network, id),
        })),
        price: priceRange(items),
      },
    })
  }),

  route('get', '/nfts/featured', () => {
    const items = catalog()
    const trending = [...items].sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 6)
    const highlight = items.find((nft) => nft.id === 'cosmic-bloom-118') ?? null
    // A oferta termina no fim do terceiro dia a partir de hoje (relativo ao relógio, que os testes controlam).
    const offerEndsAt = new Date(Date.now() + 3 * 86_400_000)
    offerEndsAt.setHours(23, 59, 0, 0)
    return HttpResponse.json<Featured>({
      highlight: highlight ? { ...toSummary(highlight), offerEndsAt: offerEndsAt.toISOString() } : null,
      trending: trending.map(toSummary),
    })
  }),

  route('get', '/nfts/:id', ({ params }) => HttpResponse.json<NftDetail>(toDetail(requireNft(params.id!)))),

  route('get', '/nfts/:id/related', ({ params }) => {
    const nft = requireNft(params.id!)
    const related = db.nfts
      .filter((item) => item.id !== nft.id)
      .sort((a, b) => Number(b.series === nft.series) - Number(a.series === nft.series) || b.listedAt.localeCompare(a.listedAt))
      .slice(0, 8)
    return HttpResponse.json<Related>({ items: related.map(toSummary) })
  }),
]

export const favoriteHandlers = [
  route('get', '/me/favorites', ({ request }) => {
    const { user } = requireUser(request)
    const ids = db.favorites[user.id] ?? []
    const items = ids.flatMap((id) => {
      const nft = findNft(id)
      return nft ? [toSummary(nft)] : []
    })
    return HttpResponse.json<Favorites>({ items })
  }),

  route('put', '/me/favorites/:nftId', ({ request, params }) => {
    const { user } = requireUser(request)
    const nft = requireNft(params.nftId!)
    const ids = db.favorites[user.id] ?? []
    db.favorites[user.id] = [nft.id, ...ids.filter((id) => id !== nft.id)]
    return HttpResponse.json<FavoriteToggle>({ nftId: nft.id, favorited: true })
  }),

  route('delete', '/me/favorites/:nftId', ({ request, params }) => {
    const { user } = requireUser(request)
    db.favorites[user.id] = (db.favorites[user.id] ?? []).filter((id) => id !== params.nftId)
    return HttpResponse.json<FavoriteToggle>({ nftId: params.nftId!, favorited: false })
  }),
]
