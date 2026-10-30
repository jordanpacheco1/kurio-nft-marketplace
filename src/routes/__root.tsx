import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet, useLocation } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { SessionWatcher } from '@/features/auth/components/session-watcher'
import { useCartCount } from '@/features/cart/queries'
import { PendingOrderWatcher } from '@/features/orders/components/pending-order-watcher'
import { NotFound } from '@/shared/ui/not-found'
import { SiteFooter } from '@/shared/ui/site-footer'
import { SiteHeader } from '@/shared/ui/site-header'
import { TabBar } from '@/shared/ui/tab-bar'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  const { pathname } = useLocation()
  const cartCount = useCartCount()
  // No mobile, o detalhe, o carrinho e o pagamento trocam a tab bar pela própria barra (compra / resumo),
  // e login e cadastro são telas cheias, sem tab bar nem footer.
  const onDetail = pathname.startsWith('/nft/')
  const onAuth = pathname === '/login' || pathname === '/cadastro'
  const onCart = pathname === '/carrinho' || pathname === '/checkout'
  const showTabBar = !onDetail && !onAuth && !onCart

  return (
    <div className={cn('flex min-h-dvh flex-col lg:pb-0', onDetail ? 'pb-44' : showTabBar && 'pb-24')}>
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
      <div className={cn((onAuth || onCart) && 'hidden lg:block')}>
        <SiteFooter />
      </div>
      {showTabBar && <TabBar cartCount={cartCount} />}
      <SessionWatcher />
      <PendingOrderWatcher />
    </div>
  )
}
