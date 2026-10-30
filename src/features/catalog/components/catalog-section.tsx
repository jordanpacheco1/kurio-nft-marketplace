import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { Filter } from 'react-iconly'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { CatalogFilters } from '@/features/catalog/components/catalog-filters'
import { CatalogTabs, SortSelect } from '@/features/catalog/components/catalog-toolbar'
import { FeaturedCard } from '@/features/catalog/components/featured-card'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { Pagination } from '@/features/catalog/components/pagination'
import { SearchField } from '@/features/catalog/components/search-field'
import { nftListQuery } from '@/features/catalog/queries'
import { HOME_SEARCH_DEFAULTS, toListParams, type HomeSearch } from '@/features/catalog/search'
import { useHomeSearch } from '@/features/catalog/use-home-search'
import { NFT_PAGE_SIZE } from '@/shared/contracts'
import { Icon } from '@/shared/ui/icon'

const hasFilters = (s: HomeSearch) =>
  !!s.q || s.collections.length > 0 || s.networks.length > 0 || s.min !== undefined || s.max !== undefined

/** Barra do topo da home no mobile: busca + botão que abre os filtros num sheet. */
export function MobileSearchBar() {
  const { search } = useHomeSearch()
  const { data } = useQuery(nftListQuery(toListParams(search)))
  const active = search.collections.length + search.networks.length + (search.min ?? search.max ? 1 : 0)

  return (
    <div className="flex items-center gap-2 lg:hidden">
      <SearchField className="flex-1" inputClassName="h-11 rounded-xl" />
      <Sheet>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label={active ? `Filtros (${active} ativos)` : 'Filtros'}
            className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-copper text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper"
          >
            <Icon as={Filter} size={22} />
            {active > 0 && (
              <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-fg text-tiny font-bold text-ink">
                {active}
              </span>
            )}
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-4xl border-0 bg-surface p-6 pb-8 shadow-sheet">
          <SheetTitle className="mb-1 text-lg">Filtros</SheetTitle>
          <SheetDescription className="mb-5 text-xs text-fg-secondary">
            Coleções e rede filtram na hora; o preço vale ao tocar em Aplicar.
          </SheetDescription>
          <SortSelect className="mb-6" />
          <CatalogFilters facets={data?.facets} />
          <SheetClose asChild>
            <Button className="mt-8 h-12 rounded-full bg-cta-gradient text-base font-bold text-ink">
              {data ? `Ver ${data.total} resultados` : 'Ver resultados'}
            </Button>
          </SheetClose>
        </SheetContent>
      </Sheet>
    </div>
  )
}

/** Sidebar de filtros + abas, ordenação, grid e paginação. */
export function CatalogSection() {
  const { search, update } = useHomeSearch()
  const query = useQuery(nftListQuery(toListParams(search)))
  const { data, isError, isFetching, isPlaceholderData, refetch } = query
  const refreshing = isFetching && isPlaceholderData

  const clearFilters = () =>
    void update({ q: '', collections: [], networks: [], min: undefined, max: undefined, tab: HOME_SEARCH_DEFAULTS.tab })

  return (
    <section id="catalogo" aria-labelledby="catalog-title" className="scroll-mt-4 lg:grid lg:grid-cols-[310px_1fr] lg:gap-6">
      <h2 id="catalog-title" className="sr-only">
        Catálogo de NFTs
      </h2>

      <aside aria-label="Filtros" className="hidden flex-col gap-4 lg:flex">
        <div className="rounded-sm bg-surface px-3 py-4">
          <CatalogFilters facets={data?.facets} />
        </div>
        <FeaturedCard />
      </aside>

      <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CatalogTabs />
          <SortSelect className="hidden lg:flex" />
        </div>

        <p role="status" className="sr-only">
          {refreshing ? 'Atualizando resultados…' : data ? `${data.total} NFTs encontrados` : ''}
        </p>
        {refreshing && (
          <p aria-hidden="true" className="-mb-3 text-xs text-fg-secondary">
            Atualizando resultados…
          </p>
        )}

        {isError && !isFetching ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-sm bg-surface p-6">
            <p className="text-body text-fg">Não foi possível carregar o catálogo.</p>
            <p className="text-xs text-fg-secondary">Verifique sua conexão e tente de novo.</p>
            <Button size="sm" onClick={() => void refetch()}>
              Tentar de novo
            </Button>
          </div>
        ) : !data || (isError && isFetching) ? (
          <div aria-busy="true" aria-label="Carregando NFTs" className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-3 lg:gap-x-5 lg:gap-y-10">
            {Array.from({ length: NFT_PAGE_SIZE }, (_, i) => (
              <NftCardSkeleton key={i} />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-sm bg-surface px-6 py-12 text-center">
            <p className="text-body text-fg">Nenhum NFT encontrado.</p>
            <p className="text-xs text-fg-secondary">
              {hasFilters(search) ? 'Tente outra busca ou remova alguns filtros.' : 'O catálogo está vazio no momento.'}
            </p>
            {hasFilters(search) && (
              <Button size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <ul
            aria-busy={refreshing}
            className={cn(
              'grid grid-cols-2 gap-x-4 gap-y-6 pb-8 transition-opacity lg:grid-cols-3 lg:gap-x-5 lg:gap-y-10 lg:pb-0',
              // Mobile: segunda coluna desencontrada, como no Figma.
              '[&>li:nth-child(even)]:translate-y-8 lg:[&>li:nth-child(even)]:translate-y-0',
              refreshing && 'opacity-60',
            )}
          >
            {data.items.map((nft, index) => (
              <li key={nft.id}>
                <NftCard nft={nft} priority={index < 2} />
              </li>
            ))}
          </ul>
        )}

        {data && !isError && <Pagination page={data.page} totalPages={data.totalPages} />}
      </div>
    </section>
  )
}
