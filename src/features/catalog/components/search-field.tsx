import { useLocation, useNavigate, useSearch } from '@tanstack/react-router'
import { cn } from 'cn'
import { useEffect, useState, type KeyboardEvent } from 'react'
import { Search } from 'react-iconly'
import { Icon } from '@/shared/ui/icon'

const DEBOUNCE_MS = 300

type Props = {
  className?: string
  inputClassName?: string
  placeholder?: string
  autoFocus?: boolean
  onEscape?: () => void
}

/**
 * Busca do catálogo (header no desktop, topo da home no mobile). Escreve `q` na URL com debounce
 * e `replace`, para não encher o histórico; fora da home, leva para a home com a busca.
 */
export function SearchField({ className, inputClassName, placeholder = 'Explorar coleções', autoFocus, onEscape }: Props) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const q = (useSearch({ strict: false }) as { q?: string }).q ?? ''
  const [value, setValue] = useState(q)
  const [syncedQ, setSyncedQ] = useState(q)

  // A URL mudou por fora (voltar no histórico, "Limpar filtros"): o campo acompanha.
  if (q !== syncedQ) {
    setSyncedQ(q)
    if (q !== value.trim()) setValue(q)
  }

  useEffect(() => {
    const term = value.trim()
    if (term === q) return
    const timer = setTimeout(() => {
      void navigate({
        to: '/',
        search: (prev) => ({ ...(pathname === '/' ? prev : {}), q: term, page: 1 }),
        replace: pathname === '/',
        resetScroll: false,
      })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [value, q, pathname, navigate])

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') onEscape?.()
  }

  return (
    <search className={cn('relative flex items-center', className)}>
      <span className="pointer-events-none absolute left-3 text-fg-secondary">
        <Icon as={Search} size={20} />
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label="Buscar NFTs"
        maxLength={80}
        autoFocus={autoFocus} // só quando o usuário abre a busca do header

        className={cn(
          'h-11 w-full rounded-lg bg-surface pr-3 pl-11 text-base text-fg placeholder:text-fg-secondary focus-visible:outline-2 focus-visible:outline-copper',
          inputClassName,
        )}
      />
    </search>
  )
}
