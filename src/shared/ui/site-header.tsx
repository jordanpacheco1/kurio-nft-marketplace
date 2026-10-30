import { Link, useLocation } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Buy, Login, Search } from 'react-iconly'
import { AccountMenu } from '@/features/auth/components/account-menu'
import { useCurrentUser } from '@/features/auth/queries'
import { SearchField } from '@/features/catalog/components/search-field'
import { useCartCount } from '@/features/cart/queries'
import { Icon } from '@/shared/ui/icon'

const navItem =
  'relative py-1 text-body text-fg hover:text-copper-text after:absolute after:inset-x-0 after:-bottom-[21px] after:h-0.5 after:bg-transparent'
const navActive = 'font-bold text-copper-text after:bg-copper'

// Header do desktop. No mobile cada tela tem o próprio topo e a navegação fica na tab bar.
export function SiteHeader() {
  const { pathname, href } = useLocation()
  const count = useCartCount()
  const { user, isPending } = useCurrentUser()
  const [searchOpen, setSearchOpen] = useState(false)
  const onHome = pathname === '/'
  const onMarket = pathname.startsWith('/nft/') || pathname === '/carrinho' || pathname === '/checkout'

  return (
    <header className="hidden border-b border-border lg:block">
      <div className="page-container grid h-[70px] grid-cols-[1fr_auto_1fr] items-center gap-6">
        <Link to="/" className="w-fit text-xs font-bold tracking-widest text-fg">
          KURIO
        </Link>

        <nav aria-label="Principal" className="flex gap-9">
          <Link to="/" aria-current={onHome ? 'page' : undefined} className={cn(navItem, onHome && navActive)}>
            Início
          </Link>
          <Link to="/" hash="catalogo" aria-current={onMarket ? 'page' : undefined} className={cn(navItem, onMarket && navActive)}>
            Mercado
          </Link>
          {['Criadores', 'Aprenda'].map((label) => (
            <span key={label} aria-disabled="true" title="Em breve" className="cursor-not-allowed py-1 text-body text-fg-muted">
              {label}
              <span className="sr-only"> (em breve)</span>
            </span>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-5">
          {searchOpen ? (
            <SearchField
              autoFocus
              placeholder="Buscar NFTs"
              onEscape={() => setSearchOpen(false)}
              className="w-[200px]"
              inputClassName="h-9 text-sm"
            />
          ) : (
            <button
              type="button"
              aria-label="Abrir busca"
              onClick={() => setSearchOpen(true)}
              className="text-fg hover:text-copper-text focus-visible:outline-2 focus-visible:outline-copper"
            >
              <Icon as={Search} size={22} />
            </button>
          )}
          <Link to="/carrinho" aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`} className="relative text-fg hover:text-copper-text">
            <Icon as={Buy} size={22} />
            {count > 0 && (
              <span
                data-testid="cart-badge"
                aria-hidden="true"
                className="absolute -top-1.5 -right-2 grid min-w-4 place-items-center rounded-full bg-copper px-1 text-tiny font-bold text-ink"
              >
                {count}
              </span>
            )}
          </Link>
          {user ? (
            <AccountMenu user={user} />
          ) : isPending ? (
            <span aria-hidden="true" className="skeleton size-8 rounded-full" />
          ) : (
            <Link
              to="/login"
              search={{ redirect: pathname === '/login' || pathname === '/cadastro' ? undefined : href }}
              className="flex items-center gap-1 rounded-sm bg-copper px-2 py-1 text-sm text-ink hover:bg-copper-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper"
            >
              <Icon as={Login} size={18} />
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
