import { Link, useLocation } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type { ComponentType } from 'react'
import { Buy, Heart, Home, Scan, User, type IconProps } from 'react-iconly'
import { Icon } from '@/shared/ui/icon'

const item =
  'relative grid size-12 place-items-center rounded-full text-fg-secondary hover:text-fg focus-visible:outline-2 focus-visible:outline-copper'

function Glyph({ as, active }: { as: ComponentType<IconProps>; active: boolean }) {
  return <Icon as={as} size={24} filled={active} />
}

/** Tab bar do mobile (abaixo de 1024 px). Some no detail, que tem a própria barra de compra. */
export function TabBar({ cartCount }: { cartCount: number }) {
  const { pathname } = useLocation()
  const onHome = pathname === '/'
  const onCart = pathname === '/carrinho'
  const onFavorites = pathname === '/perfil/favoritos'
  const onProfile = pathname.startsWith('/perfil') && !onFavorites

  return (
    <nav
      aria-label="Navegação"
      className="fixed inset-x-0 bottom-0 z-30 h-[84px] rounded-t-[28px] bg-surface px-6 pb-[env(safe-area-inset-bottom)] shadow-sheet lg:hidden"
    >
      <ul className="mx-auto grid h-full max-w-md grid-cols-5 items-center justify-items-center">
        <li>
          <Link to="/" aria-label="Início" aria-current={onHome ? 'page' : undefined} className={cn(item, onHome && 'text-copper-text')}>
            <Glyph as={Home} active={onHome} />
          </Link>
        </li>
        <li>
          {/* Rotas protegidas: o guard leva o visitante ao login e de volta. */}
          <Link to="/perfil/favoritos" aria-label="Favoritos" aria-current={onFavorites ? 'page' : undefined} className={cn(item, onFavorites && 'text-copper-text')}>
            <Glyph as={Heart} active={onFavorites} />
          </Link>
        </li>
        <li className="-mt-10">
          <button
            type="button"
            disabled
            title="Em breve"
            aria-label="Escanear (em breve)"
            className="grid size-16 cursor-not-allowed place-items-center rounded-full border-4 border-ink bg-cta-gradient text-ink shadow-float"
          >
            <Icon as={Scan} size={26} />
          </button>
        </li>
        <li>
          <Link
            to="/carrinho"
            aria-label={`Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
            aria-current={onCart ? 'page' : undefined}
            className={cn(item, onCart && 'text-copper-text')}
          >
            <Glyph as={Buy} active={onCart} />
            {cartCount > 0 && (
              <span aria-hidden="true" className="absolute top-1 right-0.5 grid min-w-4 place-items-center rounded-full bg-copper px-1 text-tiny font-bold text-ink">
                {cartCount}
              </span>
            )}
          </Link>
        </li>
        <li>
          <Link to="/perfil" aria-label="Perfil" aria-current={onProfile ? 'page' : undefined} className={cn(item, onProfile && 'text-copper-text')}>
            <Glyph as={User} active={onProfile} />
          </Link>
        </li>
      </ul>
    </nav>
  )
}
