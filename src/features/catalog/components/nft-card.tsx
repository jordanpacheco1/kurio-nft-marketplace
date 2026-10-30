import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { Buy, Heart, Search } from 'react-iconly'
import { useQuickAdd } from '@/features/catalog/use-quick-add'
import { useFavorites } from '@/features/favorites/queries'
import type { NftSummary } from '@/shared/contracts'
import { formatEth } from '@/shared/money'
import { Icon } from '@/shared/ui/icon'
import { NftImage } from '@/shared/ui/nft-image'
import { ZoomDialog } from '@/shared/ui/zoom-dialog'

type Props = {
  nft: NftSummary
  /** Valor de `sizes` da imagem; muda entre o grid e a linha de relacionados. */
  sizes?: string
  priority?: boolean
}

const actionClass =
  'grid size-9 place-items-center rounded-full bg-ink/85 text-fg shadow-card transition-colors hover:bg-copper hover:text-ink focus-visible:bg-copper focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper disabled:opacity-50'

/**
 * Card do catálogo. O link do nome cobre o card inteiro (`after:inset-0`); as ações ficam por cima.
 * No desktop as ações aparecem no hover ou com o foco; no mobile só o coração, sempre visível.
 */
export function NftCard({ nft, sizes = '(min-width: 1024px) 260px, 45vw', priority }: Props) {
  const favorites = useFavorites()
  const quickAdd = useQuickAdd()
  const favorited = favorites.isFavorite(nft.id)
  const soldOut = nft.available === 0

  return (
    <article data-testid="nft-card" className="group relative flex flex-col gap-2 lg:gap-3">
      <div className="relative rounded-2xl bg-card-gradient p-1.5 shadow-float lg:rounded-sm lg:bg-surface lg:p-3 lg:shadow-none">
        <NftImage image={nft.image} sizes={sizes} priority={priority} className="rounded-xl lg:rounded-lg" />

        {nft.rare && (
          <span className="absolute top-1.5 left-1.5 rounded-tl-xl rounded-br-md bg-copper px-2 py-1 text-xs font-bold text-ink lg:top-3 lg:left-3 lg:rounded-tl-lg">
            RARO
          </span>
        )}
        {soldOut && (
          <span className="absolute right-1.5 bottom-1.5 rounded-md bg-ink/90 px-2 py-1 text-xs font-bold text-fg lg:right-3 lg:bottom-3">
            Esgotado
          </span>
        )}

        {/* Mobile: coração no canto */}
        <button
          type="button"
          onClick={() => favorites.toggle(nft)}
          aria-pressed={favorited}
          aria-label={`Favoritar ${nft.name}`}
          className={cn(
            'absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-lg bg-ink/70 text-fg lg:hidden',
            favorited && 'text-copper-text',
          )}
        >
          <Icon as={Heart} size={20} filled={favorited} />
        </button>

        {/* Desktop: três ações no hover */}
        <div className="absolute inset-x-0 bottom-5 z-10 hidden justify-center gap-3 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none lg:flex">
          <button
            type="button"
            className={actionClass}
            disabled={soldOut || quickAdd.isPending}
            onClick={() => void quickAdd.add(nft)}
            aria-label={soldOut ? `${nft.name} esgotado` : `Adicionar ${nft.name} ao carrinho`}
          >
            <Icon as={Buy} size={18} />
          </button>
          <button
            type="button"
            className={cn(actionClass, favorited && 'text-copper-text')}
            onClick={() => favorites.toggle(nft)}
            aria-pressed={favorited}
            aria-label={`Favoritar ${nft.name}`}
          >
            <Icon as={Heart} size={18} filled={favorited} />
          </button>
          <ZoomDialog
            image={nft.image}
            name={nft.name}
            trigger={
              <button type="button" className={actionClass} aria-label={`Ampliar imagem de ${nft.name}`}>
                <Icon as={Search} size={18} />
              </button>
            }
          />
        </div>
      </div>

      <div className="px-1 lg:px-0">
        <h3 className="text-lg leading-6 text-fg lg:text-body">
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-copper"
          >
            {nft.name}
          </Link>
        </h3>
        <p className="text-lg leading-6 font-bold text-copper-text lg:text-body" data-testid="nft-price">
          {formatEth(nft.priceEth)}
        </p>
      </div>
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2 lg:gap-3">
      <div className="rounded-2xl bg-surface p-1.5 lg:rounded-sm lg:p-3">
        <div className="skeleton aspect-square w-full rounded-xl lg:rounded-lg" />
      </div>
      <div className="skeleton h-5 w-3/4" />
      <div className="skeleton h-5 w-1/3" />
    </div>
  )
}
