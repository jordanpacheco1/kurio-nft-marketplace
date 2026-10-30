import { Link, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { cn } from 'cn'
import { useState } from 'react'
import { Buy, ChevronLeft, Heart, Star } from 'react-iconly'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAddToCart } from '@/features/cart/queries'
import { useFavorites } from '@/features/favorites/queries'
import { Gallery } from '@/features/nft/components/gallery'
import { EditionPicker, QuantityStepper } from '@/features/nft/components/purchase-controls'
import { RelatedRow } from '@/features/nft/components/related-row'
import { COLLECTION_LABELS, MAX_QUANTITY_PER_ITEM, NETWORK_LABELS, type NftDetail } from '@/shared/contracts'
import { formatEth, mulEth } from '@/shared/money'
import { Icon } from '@/shared/ui/icon'
import { NftImage } from '@/shared/ui/nft-image'

type Props = { nft: NftDetail; requestedEdition?: string }

/** Edição em uso: a pedida na URL (mesmo esgotada, para mostrar o aviso) ou a primeira com estoque. */
function pickEdition(nft: NftDetail, requested?: string) {
  const fromUrl = requested ? nft.editions.find((edition) => edition.id === requested) : undefined
  const edition = fromUrl ?? nft.editions.find((item) => item.available > 0) ?? nft.editions[0]!
  return { edition, missing: !!requested && !fromUrl }
}

export function NftDetailView({ nft, requestedEdition }: Props) {
  const navigate = useNavigate()
  const favorites = useFavorites()
  const addToCart = useAddToCart()
  const [quantity, setQuantity] = useState(1)

  // Sem `?edition=`, a escolha inicial fica fixa: se ela esgotar em tempo real, o aviso aparece em vez de trocar sozinha.
  const [initialEdition] = useState(() => pickEdition(nft, requestedEdition).edition.id)
  const { edition, missing } = pickEdition(nft, requestedEdition ?? initialEdition)
  const allSoldOut = nft.editions.every((item) => item.available === 0)
  const soldOut = edition.available === 0
  const max = Math.max(1, Math.min(edition.available, MAX_QUANTITY_PER_ITEM))
  // O estoque pode cair em tempo real: a quantidade escolhida acompanha o novo limite.
  const qty = Math.min(quantity, max)
  const favorited = favorites.isFavorite(nft.id)

  const selectEdition = (id: string) => {
    setQuantity(1)
    void navigate({
      to: '/nft/$nftId',
      params: { nftId: nft.id },
      search: { edition: id },
      replace: true,
      resetScroll: false,
    })
  }

  const add = (then?: () => void) =>
    addToCart.mutate({ nftId: nft.id, editionId: edition.id, quantity: qty, name: nft.name }, { onSuccess: then })

  const buy = () => add(() => void navigate({ to: '/carrinho' }))

  const notice = allSoldOut
    ? 'Todas as edições deste NFT estão esgotadas.'
    : missing
      ? `A edição pedida não existe para este NFT. Mostrando a edição ${edition.label}.`
      : soldOut
        ? `A edição ${edition.label} está esgotada. Escolha outra edição.`
        : null

  return (
    <div className="flex flex-col gap-10 lg:page-container lg:gap-16 lg:pt-6">
      <div>
        <Breadcrumb name={nft.name} />
        <div className="lg:mt-3 lg:grid lg:grid-cols-[minmax(0,535px)_minmax(0,1fr)] lg:items-start lg:gap-8">
          <MobileMedia nft={nft} favorited={favorited} onFavorite={() => favorites.toggle(nft)} />
          <div className="hidden lg:block">
            <Gallery nft={nft} />
          </div>

          <section
            aria-labelledby="nft-title"
            className="relative z-10 -mt-12 flex flex-col gap-4 rounded-t-4xl bg-surface px-6 pt-7 shadow-sheet lg:mt-0 lg:gap-3 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none"
          >
            <div className="flex items-start justify-between gap-3">
              <h1 id="nft-title" className="text-xl font-bold text-fg lg:text-heading">
                {nft.name}
              </h1>
              <RatingChip rating={nft.rating} />
            </div>
            <div className="hidden items-center justify-between border-b border-border pb-3 lg:flex">
              <p className="text-title font-bold text-copper-text" data-testid="detail-price">
                {formatEth(edition.priceEth)}
              </p>
              <Stars rating={nft.rating} />
            </div>

            <div>
              <h2 className="mb-2 hidden text-sm font-bold text-fg lg:block">Sobre este NFT:</h2>
              <p className="text-sm leading-6 text-fg-secondary lg:text-xs">{nft.description}</p>
            </div>

            <EditionPicker editions={nft.editions} selectedId={edition.id} onSelect={selectEdition} />
            {notice && (
              <p role="status" className="rounded-md border border-danger/60 px-3 py-2 text-xs text-danger">
                {notice}
              </p>
            )}

            {/* Barra de compra: fixa no rodapé no mobile, em linha no desktop. */}
            <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-4 rounded-t-4xl bg-surface px-6 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-sheet lg:static lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:rounded-none lg:bg-transparent lg:p-0 lg:py-2 lg:shadow-none">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-fg lg:sr-only">Qtd.</span>
                  <QuantityStepper value={qty} max={max} onChange={setQuantity} disabled={soldOut} />
                </div>
                <p className="text-xl font-bold text-copper-text lg:hidden" aria-label={`Total: ${formatEth(mulEth(edition.priceEth, qty))}`}>
                  {formatEth(mulEth(edition.priceEth, qty))}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={buy}
                  disabled={soldOut || addToCart.isPending}
                  className="h-14 flex-1 rounded-full bg-cta-gradient text-base font-bold text-ink lg:h-10 lg:w-[130px] lg:flex-none lg:rounded-sm lg:bg-copper lg:bg-none lg:text-xs lg:uppercase"
                >
                  <span className="lg:hidden">Comprar NFT</span>
                  <span className="hidden lg:inline">Comprar</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => add()}
                  disabled={soldOut || addToCart.isPending}
                  aria-label="Adicionar ao carrinho"
                  className="size-14 rounded-full bg-surface-raised text-copper-text hover:bg-line-strong lg:size-10 lg:rounded-sm lg:border lg:border-copper lg:bg-transparent"
                >
                  <Icon as={Buy} size={22} />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => favorites.toggle(nft)}
                  aria-pressed={favorited}
                  className={cn(
                    'hidden h-10 rounded-sm border border-copper px-3 text-caption text-fg hover:bg-surface-raised lg:inline-flex',
                    favorited && 'text-copper-text',
                  )}
                >
                  <Icon as={Heart} size={20} filled={favorited} />
                  {favorited ? 'Favoritado' : 'Favoritar'}
                </Button>
              </div>
            </div>

            <dl className="flex flex-col gap-3 text-sm text-fg-muted lg:text-caption">
              <div className="flex gap-1">
                <dt>ID do token:</dt>
                <dd>{nft.tokenId}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Coleção:</dt>
                <dd>{nft.series}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Atributos:</dt>
                <dd>{nft.attributes.map((attribute) => attribute.value).join(', ')}</dd>
              </div>
            </dl>
            <Share name={nft.name} />
          </section>
        </div>
      </div>

      <div className="px-6 lg:px-0">
        <DetailTabs nft={nft} />
      </div>
      <div className="px-4 lg:px-0">
        <RelatedRow nftId={nft.id} title="Mais desta coleção" />
      </div>
    </div>
  )
}

function Breadcrumb({ name }: { name: string }) {
  return (
    <nav aria-label="Trilha" className="hidden text-caption font-bold text-fg lg:block">
      <ol className="flex gap-1">
        <li>
          <Link to="/" className="hover:text-copper-text">
            Início
          </Link>
          <span aria-hidden="true"> /</span>
        </li>
        <li>
          <Link to="/" hash="catalogo" className="hover:text-copper-text">
            Mercado
          </Link>
          <span aria-hidden="true"> /</span>
        </li>
        <li aria-current="page" className="font-normal text-fg-secondary">
          {name}
        </li>
      </ol>
    </nav>
  )
}

function MobileMedia({ nft, favorited, onFavorite }: { nft: NftDetail; favorited: boolean; onFavorite: () => void }) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const roundButton =
    'grid size-9 place-items-center rounded-full border border-line-strong text-fg focus-visible:outline-2 focus-visible:outline-copper'

  return (
    <div className="flex flex-col gap-3 px-7 pt-6 lg:hidden">
      <div className="flex justify-between">
        {canGoBack ? (
          <button type="button" onClick={() => router.history.back()} className={roundButton} aria-label="Voltar">
            <Icon as={ChevronLeft} size={18} />
          </button>
        ) : (
          <Link to="/" className={roundButton} aria-label="Voltar ao início">
            <Icon as={ChevronLeft} size={18} />
          </Link>
        )}
        <button
          type="button"
          onClick={onFavorite}
          aria-pressed={favorited}
          aria-label={`Favoritar ${nft.name}`}
          className={cn(roundButton, favorited && 'text-copper-text')}
        >
          <Icon as={Heart} size={18} filled={favorited} />
        </button>
      </div>
      <NftImage image={nft.image} sizes="100vw" priority alt={nft.name} className="rounded-[22px]" />
    </div>
  )
}

function Stars({ rating }: { rating: NftDetail['rating'] }) {
  const filled = Math.round(rating.average)
  return (
    <p className="flex items-center gap-1 text-caption text-fg">
      <span role="img" aria-label={`Nota ${rating.average.toLocaleString('pt-BR')} de 5`} className="flex text-rating">
        {Array.from({ length: 5 }, (_, i) => (
          <Icon key={i} as={Star} size={14} filled={i < filled} />
        ))}
      </span>
      {rating.count} avaliações de colecionadores
    </p>
  )
}

function RatingChip({ rating }: { rating: NftDetail['rating'] }) {
  return (
    <p
      className="flex shrink-0 items-center gap-1 rounded-full border border-copper px-2 py-0.5 text-sm font-bold text-fg lg:hidden"
      aria-label={`Nota ${rating.average.toLocaleString('pt-BR')} de 5, ${rating.count} avaliações`}
    >
      <span className="text-rating">
        <Icon as={Star} size={16} filled />
      </span>
      {rating.average.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
      <span className="font-normal text-fg-secondary">({rating.count})</span>
    </p>
  )
}

function Share({ name }: { name: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copiado')
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }
  const mail = `mailto:?subject=${encodeURIComponent(name)}&body=${encodeURIComponent(typeof window === 'undefined' ? '' : window.location.href)}`

  return (
    <div className="hidden items-center gap-3 text-caption font-bold text-fg lg:flex">
      Compartilhar este NFT:
      <button type="button" onClick={() => void copy()} className="font-normal text-copper-text underline-offset-4 hover:underline">
        Copiar link
      </button>
      <a href={mail} className="font-normal text-copper-text underline-offset-4 hover:underline">
        E-mail
      </a>
    </div>
  )
}

function DetailTabs({ nft }: { nft: NftDetail }) {
  const trigger =
    'flex-none rounded-none border-0 border-b-2 border-transparent px-0 pb-2 text-tab text-fg data-[state=active]:border-copper data-[state=active]:font-bold data-[state=active]:text-copper-text after:hidden'

  return (
    <Tabs defaultValue="details" className="gap-4">
      <TabsList variant="line" className="h-auto w-full justify-start gap-8 overflow-x-auto border-b border-border p-0">
        <TabsTrigger value="details" className={trigger}>
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger value="reviews" className={trigger}>
          Avaliações de colecionadores ({nft.rating.count})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="details" className="flex flex-col gap-4 text-xs leading-6 text-fg-secondary">
        <p>{nft.description}</p>
        <div>
          <h3 className="font-bold text-fg">Rede:</h3>
          <p>
            Cunhado na {NETWORK_LABELS[nft.network]}, com procedência registrada e metadados armazenados no IPFS.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-fg">Criador:</h3>
          <p>
            {nft.creator} · série {nft.series} · categoria {COLLECTION_LABELS[nft.collection]}
          </p>
        </div>
        <div>
          <h3 className="font-bold text-fg">Edições:</h3>
          <p>
            {nft.editions
              .map((item) => `${item.label}: ${formatEth(item.priceEth)}, ${item.available === 0 ? 'esgotada' : `${item.available} disponíveis`}`)
              .join(' · ')}
          </p>
        </div>
      </TabsContent>
      <TabsContent value="reviews" className="text-xs leading-6 text-fg-secondary">
        <p>
          Nota média {nft.rating.average.toLocaleString('pt-BR')} de 5, com {nft.rating.count} avaliações. Os
          comentários dos colecionadores chegam em breve.
        </p>
      </TabsContent>
    </Tabs>
  )
}
