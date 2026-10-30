import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { featuredQuery } from '@/features/catalog/queries'
import { formatEth } from '@/shared/money'
import { NftImage } from '@/shared/ui/nft-image'

/** "NFT em destaque / Oferta limitada", de `GET /nfts/featured`. Some com o catálogo vazio ou em erro. */
export function FeaturedCard() {
  const { data, isPending } = useQuery(featuredQuery())
  if (isPending) return <div aria-hidden="true" className="skeleton h-[330px] w-full rounded-sm" />
  const nft = data?.highlight
  if (!nft) return null

  return (
    <section aria-labelledby="featured-title" className="relative overflow-hidden rounded-sm bg-surface">
      <h2 id="featured-title" className="px-3 pt-4 text-lg leading-6 font-bold text-copper-text uppercase">
        NFT em destaque
      </h2>
      <p className="pb-2 text-center text-base font-bold text-fg uppercase">Oferta limitada</p>
      <NftImage image={nft.image} sizes="310px" className="rounded-xl" />
      <p className="px-3 py-3 text-caption">
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          className="after:absolute after:inset-0 hover:text-copper-text focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-copper"
        >
          {nft.name}
        </Link>{' '}
        · <span className="font-bold text-copper-text">{formatEth(nft.priceEth)}</span>
      </p>
    </section>
  )
}
