import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { isNotFound, nftDetailQuery, relatedQuery } from '@/features/catalog/queries'
import { NftDetailView } from '@/features/nft/components/nft-detail'

export const Route = createFileRoute('/nft/$nftId')({
  validateSearch: z.object({ edition: z.string().max(20).optional().catch(undefined) }),
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftDetailQuery(params.nftId))
    void context.queryClient.prefetchQuery(relatedQuery(params.nftId))
  },
  component: NftPage,
})

function NftPage() {
  const { nftId } = Route.useParams()
  const { edition } = Route.useSearch()
  const { data, isPending, isError, error, isFetching, refetch } = useQuery(nftDetailQuery(nftId))

  if (isPending || (isError && isFetching)) return <DetailSkeleton />
  if (isError && isNotFound(error)) return <NftNotFound />
  if (isError)
    return (
      <section role="alert" className="page-container flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-heading">Não foi possível carregar este NFT</h1>
        <p className="text-sm text-fg-secondary">Verifique sua conexão e tente de novo.</p>
        <Button onClick={() => void refetch()}>Tentar de novo</Button>
      </section>
    )

  return <NftDetailView key={data.id} nft={data} requestedEdition={edition} />
}

function NftNotFound() {
  return (
    <section className="page-container flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-display font-bold text-copper-text">404</p>
      <h1 className="text-heading">NFT não encontrado</h1>
      <p className="text-sm text-fg-secondary">Ele pode ter sido removido do mercado ou o endereço está errado.</p>
      <Button asChild>
        <Link to="/">Explorar o catálogo</Link>
      </Button>
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando NFT" className="lg:page-container lg:pt-6">
      <div className="lg:mt-9 lg:grid lg:grid-cols-[535px_1fr] lg:gap-8">
        <div className="px-7 pt-[72px] lg:flex lg:gap-6 lg:p-0">
          <div className="hidden w-[100px] flex-col gap-4 lg:flex">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton aspect-square w-full" />
            ))}
          </div>
          <div className="skeleton aspect-square w-full flex-1 rounded-[22px] lg:rounded-sm" />
        </div>
        <div className="flex flex-col gap-4 px-6 pt-8 lg:p-0">
          <div className="skeleton h-9 w-2/3" />
          <div className="skeleton h-7 w-1/4" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-8 w-1/2" />
          <div className="skeleton h-10 w-full" />
        </div>
      </div>
    </div>
  )
}
