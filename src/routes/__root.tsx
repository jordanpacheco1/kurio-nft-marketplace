import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet, useLocation } from '@tanstack/react-router'
import { cn } from 'cn'
import { NotFound } from '@/shared/ui/not-found'
import { SiteFooter } from '@/shared/ui/site-footer'
import { useCartCount } from '@/features/cart/queries'
import { SiteHeader } from '@/shared/ui/site-header'
import { TabBar } from '@/shared/ui/tab-bar'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  const { pathname } = useLocation()
  const cartCount = useCartCount()
  // No detalhe o mobile troca a tab bar pela barra de compra, que é mais alta.
  const onDetail = pathname.startsWith('/nft/')

  return (
    <div className={cn('flex min-h-dvh flex-col lg:pb-0', onDetail ? 'pb-44' : 'pb-24')}>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-sm bg-copper px-3 py-2 text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      {!onDetail && <TabBar cartCount={cartCount} />}
    </div>
  )
}
