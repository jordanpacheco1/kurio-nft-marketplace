import { Link, useCanGoBack, useRouter } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { ChevronLeft } from 'react-iconly'
import { Button } from '@/components/ui/button'
import { CartCards, CartTable } from '@/features/cart/components/cart-lines'
import { CartSummary } from '@/features/cart/components/cart-summary'
import { dismissCartNotice, useCartNotices } from '@/features/cart/notices'
import { useCart } from '@/features/cart/queries'
import { RelatedRow } from '@/features/nft/components/related-row'
import { Icon } from '@/shared/ui/icon'
import { DESKTOP_QUERY, useMediaQuery } from '@/shared/ui/use-media-query'

function MobileTop() {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  return (
    <div className="relative flex h-14 items-center justify-center lg:hidden">
      <button
        type="button"
        aria-label="Voltar"
        onClick={() => (canGoBack ? router.history.back() : void router.navigate({ to: '/' }))}
        className="absolute left-0 grid size-9 place-items-center rounded-full bg-surface-raised text-fg focus-visible:outline-2 focus-visible:outline-copper"
      >
        <Icon as={ChevronLeft} size={18} />
      </button>
      <h1 className="text-tab font-bold text-fg">Carrinho de NFTs</h1>
    </div>
  )
}

function DesktopTop() {
  return (
    <div className="hidden lg:block">
      <nav aria-label="Trilha" className="text-body font-bold text-fg">
        <ol className="flex gap-2">
          <li>
            <Link to="/" className="hover:text-copper-text">Início</Link> /
          </li>
          <li>
            <Link to="/" hash="catalogo" className="hover:text-copper-text">Mercado</Link> /
          </li>
          <li aria-current="page">Carrinho</li>
        </ol>
      </nav>
      <h1 className="sr-only">Carrinho</h1>
    </div>
  )
}

/** Avisos de preço e estoque recebidos pelo socket. Já foram anunciados no aria-live; aqui ficam visíveis. */
function Notices() {
  const notices = useCartNotices()
  if (!notices.length) return null
  return (
    <ul aria-label="Mudanças no carrinho" className="flex flex-col gap-2">
      {notices.map((notice) => (
        <li key={notice.id} data-testid="cart-notice" className="flex items-start justify-between gap-3 rounded-[5px] border border-copper/60 bg-copper/10 px-3 py-2 text-caption text-fg">
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => dismissCartNotice(notice.id)}
            className="shrink-0 text-copper-text hover:underline focus-visible:outline-2 focus-visible:outline-copper"
          >
            Dispensar
          </button>
        </li>
      ))}
    </ul>
  )
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando carrinho" className="flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_332px] lg:gap-[86px]">
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="skeleton h-[100px] rounded-[14px] lg:h-[70px] lg:rounded-none" />
        ))}
      </div>
      <div className="skeleton h-72 rounded-t-[28px] lg:rounded-none" />
    </div>
  )
}

/**
 * Remover a linha focada tira o elemento do DOM e o foco cai no <body>. Quando o número de linhas
 * diminui e o foco se perdeu, ele vai para o próximo botão "Remover" ou, sem linhas, para o estado vazio.
 */
function useKeepFocusOnRemove(count: number | undefined) {
  const linesRef = useRef<HTMLDivElement>(null)
  const emptyRef = useRef<HTMLHeadingElement>(null)
  const previous = useRef(count)

  useEffect(() => {
    const removed = count !== undefined && previous.current !== undefined && count < previous.current
    previous.current = count
    if (!removed || document.activeElement !== document.body) return
    const next = linesRef.current?.querySelector<HTMLElement>('button[aria-label^="Remover"]:not(:disabled)')
    ;(next ?? emptyRef.current)?.focus()
  }, [count])

  return { linesRef, emptyRef }
}

export function CartPage() {
  const cart = useCart()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const { linesRef, emptyRef } = useKeepFocusOnRemove(cart.data?.items.length)

  let content
  if (cart.isPending) content = <Skeleton />
  else if (cart.isError) {
    content = (
      <div role="alert" className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-body text-fg">Não foi possível carregar o carrinho.</p>
        <Button onClick={() => void cart.refetch()} disabled={cart.isFetching}>
          Tentar de novo
        </Button>
      </div>
    )
  } else if (!cart.data.items.length) {
    content = (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <h2 ref={emptyRef} tabIndex={-1} className="text-tab font-bold text-fg focus:outline-none">
          Seu carrinho está vazio
        </h2>
        <p className="text-caption text-fg-secondary">Explore o catálogo e adicione os NFTs que quer colecionar.</p>
        <Button asChild>
          <Link to="/" hash="catalogo">
            Explorar NFTs
          </Link>
        </Button>
      </div>
    )
  } else {
    const { data } = cart
    content = (
      <>
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_332px] lg:items-start lg:gap-[86px]">
          <div ref={linesRef} className="flex flex-col gap-4">
            <Notices />
            {isDesktop ? <CartTable items={data.items} /> : <CartCards items={data.items} />}
          </div>
          <CartSummary cart={data} />
        </div>
        <div className="hidden lg:mt-24 lg:block">
          <RelatedRow nftId={data.items[0]!.nftId} title="Colecionadores também viram" />
        </div>
      </>
    )
  }

  return (
    <div className="page-container flex flex-col gap-4 pt-4 lg:gap-2 lg:pt-8">
      <MobileTop />
      <DesktopTop />
      {content}
    </div>
  )
}
