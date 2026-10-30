import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { nftListQuery } from '@/features/catalog/queries'
import { Button } from '@/components/ui/button'

const params = { page: 1 }

export const Route = createFileRoute('/')({
  // Só prefetch, sem await: o shell e os skeletons aparecem na hora.
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(nftListQuery(params))
  },
  component: HomePage,
})

function HomePage() {
  const { data, isPending, isError, refetch } = useQuery(nftListQuery(params))

  return (
    <section className="mx-auto max-w-page px-4 py-10">
      <h1 className="mb-6 text-heading font-bold">Catálogo</h1>
      {isError ? (
        <div role="alert" className="flex items-center gap-4 text-sm text-fg-secondary">
          Não foi possível carregar o catálogo.
          <Button size="sm" onClick={() => void refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : (
        <ul aria-busy={isPending} className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {isPending
            ? Array.from({ length: 4 }, (_, i) => (
                <li key={i} aria-hidden="true" className="flex flex-col gap-2">
                  <div className="skeleton aspect-square w-full" />
                  <div className="skeleton h-5 w-3/4" />
                  <div className="skeleton h-5 w-1/3" />
                </li>
              ))
            : data.items.map((nft) => (
                <li key={nft.id} data-testid="nft-card" className="flex flex-col gap-2">
                  <picture>
                    <source type="image/avif" srcSet={`/nfts/${nft.image}-320.avif 320w, /nfts/${nft.image}-640.avif 640w`} sizes="(min-width: 1024px) 280px, 45vw" />
                    <img
                      src={`/nfts/${nft.image}-640.webp`}
                      srcSet={`/nfts/${nft.image}-320.webp 320w, /nfts/${nft.image}-640.webp 640w`}
                      sizes="(min-width: 1024px) 280px, 45vw"
                      width={640}
                      height={640}
                      alt=""
                      className="aspect-square w-full rounded-xl bg-surface object-cover"
                    />
                  </picture>
                  <h2 className="text-body">{nft.name}</h2>
                  <p className="text-body font-bold text-copper-text" data-testid="nft-price">
                    {nft.priceEth} ETH
                  </p>
                </li>
              ))}
        </ul>
      )}
    </section>
  )
}
