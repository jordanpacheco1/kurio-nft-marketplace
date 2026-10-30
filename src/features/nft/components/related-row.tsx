import { useQuery } from '@tanstack/react-query'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { relatedQuery } from '@/features/catalog/queries'

// Linha estática de cards (o carrossel do Figma foi cortado em 30/10). No mobile rola na horizontal
// dentro da própria faixa, sem vazar a página.
export function RelatedRow({ nftId, title }: { nftId: string; title: string }) {
  const { data, isPending, isError } = useQuery(relatedQuery(nftId))
  if (isError || (data && data.items.length === 0)) return null

  return (
    <section aria-labelledby="related-title" className="flex flex-col gap-6">
      <h2 id="related-title" className="border-b border-border pb-2 text-tab font-bold text-copper-text">
        {title}
      </h2>
      <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-6 lg:overflow-visible lg:px-0">
        {isPending
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="w-[44vw] max-w-[200px] shrink-0 lg:w-auto lg:max-w-none">
                <NftCardSkeleton />
              </li>
            ))
          : data.items.slice(0, 5).map((nft) => (
              <li key={nft.id} className="w-[44vw] max-w-[200px] shrink-0 snap-start lg:w-auto lg:max-w-none">
                <NftCard nft={nft} sizes="(min-width: 1024px) 220px, 44vw" />
              </li>
            ))}
      </ul>
    </section>
  )
}
