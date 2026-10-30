import { Link, Outlet } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type { ComponentType } from 'react'
import { Activity, Buy, Danger, Download, Heart, Location, Logout, User, type IconProps } from 'react-iconly'
import { useLogout } from '@/features/auth/queries'
import { Icon } from '@/shared/ui/icon'

type Item = { label: string; icon: ComponentType<IconProps> } & ({ to: '/perfil' | '/perfil/carteiras' | '/perfil/favoritos' } | { to?: undefined })

// Atividade, Ofertas, Arquivos baixados e Suporte estão fora do escopo: aparecem desabilitados ("Em breve").
const ITEMS: Item[] = [
  { label: 'Dados do perfil', icon: User, to: '/perfil' },
  { label: 'Carteiras', icon: Location, to: '/perfil/carteiras' },
  { label: 'Atividade', icon: Buy },
  { label: 'Lista de interesse', icon: Heart, to: '/perfil/favoritos' },
  { label: 'Ofertas', icon: Activity },
  { label: 'Arquivos baixados', icon: Download },
  { label: 'Suporte', icon: Danger },
]

const itemClass =
  'relative flex h-[45px] items-center gap-3 px-4 text-body text-copper-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-copper'

/** Desktop: menu lateral "Meu perfil" do Figma. Mobile: o mesmo menu como pílulas roláveis. */
export function ProfileLayout() {
  const logout = useLogout()

  return (
    <div className="page-container flex flex-col gap-6 pt-4 pb-8 lg:flex-row lg:items-start lg:gap-7 lg:pt-8 lg:pb-16">
      <nav aria-label="Meu perfil" className="lg:w-[310px] lg:shrink-0 lg:bg-surface lg:pt-4">
        <p className="mb-3 text-tab font-bold text-fg lg:mb-1 lg:px-2.5 lg:text-[19px]">Meu perfil</p>

        <ul className="hidden lg:block">
          {ITEMS.map(({ label, icon, to }) => (
            <li key={label}>
              {to ? (
                <Link
                  to={to}
                  activeOptions={{ exact: true }}
                  className={cn(itemClass, 'hover:bg-surface-raised')}
                  activeProps={{ className: 'before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-copper' }}
                >
                  <Icon as={icon} size={18} />
                  {label}
                </Link>
              ) : (
                <span aria-disabled="true" title="Em breve" className={cn(itemClass, 'cursor-not-allowed opacity-70')}>
                  <Icon as={icon} size={18} />
                  {label}
                  <span className="sr-only">(em breve)</span>
                </span>
              )}
            </li>
          ))}
          <li className="border-t border-line">
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className={cn(itemClass, 'h-12 w-full font-bold hover:bg-surface-raised')}
            >
              <Icon as={Logout} size={18} />
              Sair
            </button>
          </li>
        </ul>

        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
          {ITEMS.filter((item) => item.to).map(({ label, icon, to }) => (
            <li key={label} className="shrink-0">
              <Link
                to={to!}
                activeOptions={{ exact: true }}
                className="flex h-10 items-center gap-2 rounded-full px-4 text-caption focus-visible:outline-2 focus-visible:outline-copper"
                activeProps={{ className: 'bg-copper font-bold text-ink' }}
                inactiveProps={{ className: 'bg-surface-raised text-fg' }}
              >
                <Icon as={icon} size={16} />
                {label}
              </Link>
            </li>
          ))}
          <li className="shrink-0">
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="flex h-10 items-center gap-2 rounded-full border border-line px-4 text-caption font-bold text-copper-text focus-visible:outline-2 focus-visible:outline-copper"
            >
              <Icon as={Logout} size={16} />
              Sair
            </button>
          </li>
        </ul>
      </nav>

      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
