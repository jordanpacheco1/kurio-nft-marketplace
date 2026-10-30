import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'react-iconly'
import { Icon } from '@/shared/ui/icon'

/** Páginas visíveis: todas até 7; depois, a primeira, a última e duas vizinhas da atual. */
function pages(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const around = [current - 1, current, current + 1].filter((p) => p > 1 && p < total)
  return [1, ...(around[0]! > 2 ? ['gap' as const] : []), ...around, ...(around.at(-1)! < total - 1 ? ['gap' as const] : []), total]
}

const itemClass =
  'grid size-8 place-items-center rounded-md border border-line-strong text-caption text-fg hover:bg-surface-raised'

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null
  const to = (target: number) => ({ to: '/' as const, search: (prev: Record<string, unknown>) => ({ ...prev, page: target }) })

  return (
    <nav aria-label="Paginação" className="flex justify-center gap-2 lg:justify-end">
      {page > 1 && (
        <Link {...to(page - 1)} className={itemClass} aria-label="Página anterior">
          <Icon as={ChevronLeft} size={16} />
        </Link>
      )}
      {pages(page, totalPages).map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} aria-hidden="true" className="grid size-8 place-items-center text-fg-muted">
            …
          </span>
        ) : (
          <Link
            key={item}
            {...to(item)}
            aria-label={`Página ${item}`}
            aria-current={item === page ? 'page' : undefined}
            className={cn(itemClass, item === page && 'border-copper bg-copper font-bold text-ink hover:bg-copper-dark')}
          >
            {item}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link {...to(page + 1)} className={itemClass} aria-label="Próxima página">
          <Icon as={ChevronRight} size={16} />
        </Link>
      )}
    </nav>
  )
}
