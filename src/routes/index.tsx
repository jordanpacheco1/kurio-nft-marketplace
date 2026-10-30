import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { CatalogSection, MobileSearchBar } from '@/features/catalog/components/catalog-section'
import { MintJournal, PromoCards } from '@/features/catalog/components/editorial'
import { HomeHero } from '@/features/catalog/components/home-hero'
import { featuredQuery, nftListQuery } from '@/features/catalog/queries'
import { HOME_SEARCH_DEFAULTS, homeSearchSchema, toListParams } from '@/features/catalog/search'

export const Route = createFileRoute('/')({
  validateSearch: homeSearchSchema,
  search: { middlewares: [stripSearchParams(HOME_SEARCH_DEFAULTS)] },
  loaderDeps: ({ search }) => toListParams(search),
  // Só prefetch, sem await: o shell e os skeletons aparecem na hora.
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(nftListQuery(deps))
    void context.queryClient.prefetchQuery(featuredQuery())
  },
  component: HomePage,
})

function HomePage() {
  return (
    <div className="page-container flex flex-col gap-6 pt-6 lg:gap-16 lg:pt-4">
      <MobileSearchBar />
      <HomeHero />
      <CatalogSection />
      <PromoCards />
      <MintJournal />
    </div>
  )
}
