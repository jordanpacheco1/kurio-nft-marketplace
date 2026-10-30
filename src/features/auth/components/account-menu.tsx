import { Link } from '@tanstack/react-router'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLogout } from '@/features/auth/queries'
import type { User } from '@/shared/contracts'

export function Avatar({ user, className = 'size-8' }: { user: User; className?: string }) {
  if (user.avatarUrl) return <img src={user.avatarUrl} alt="" className={`${className} rounded-full object-cover`} />
  return (
    <span aria-hidden="true" className={`${className} grid place-items-center rounded-full bg-copper text-sm font-bold text-ink uppercase`}>
      {user.displayName.charAt(0)}
    </span>
  )
}

/** Header logado: avatar + menu (Perfil, Carteiras, Sair), no lugar do botão "Entrar". */
export function AccountMenu({ user }: { user: User }) {
  const logout = useLogout()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Conta de ${user.displayName}`}
        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper"
      >
        <Avatar user={user} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 border-border bg-surface">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate text-fg">{user.displayName}</span>
          <span className="truncate text-tiny font-normal text-fg-muted">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/perfil">Perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/perfil/carteiras">Carteiras</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={logout.isPending} onSelect={() => logout.mutate()}>
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
