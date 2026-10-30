import { cn } from '@/lib/utils'
import { ChevronDown } from 'react-iconly'
import { SORT_LABELS, TAB_LABELS } from '@/features/catalog/search'
import { useHomeSearch } from '@/features/catalog/use-home-search'
import { nftSortSchema, nftTabSchema } from '@/shared/contracts'
import { Icon } from '@/shared/ui/icon'

export function CatalogTabs({ className }: { className?: string }) {
  const { search, update } = useHomeSearch()
  return (
    <div role="group" aria-label="Seção do catálogo" className={cn('flex gap-4 overflow-x-auto lg:gap-4', className)}>
      {nftTabSchema.options.map((tab) => (
        <button
          key={tab}
          type="button"
          aria-pressed={search.tab === tab}
          onClick={() => void update({ tab })}
          className={cn(
            'shrink-0 border-b-2 border-transparent pb-1 text-body whitespace-nowrap text-fg hover:text-copper-text lg:text-caption',
            search.tab === tab && 'border-copper font-bold text-copper-text',
          )}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  )
}

export function SortSelect({ className }: { className?: string }) {
  const { search, update } = useHomeSearch()
  return (
    <label className={cn('flex items-center gap-2 text-caption text-fg', className)}>
      Ordenar por:
      <span className="relative">
        <select
          value={search.sort}
          onChange={(event) => void update({ sort: nftSortSchema.parse(event.target.value) })}
          className="appearance-none rounded-md bg-transparent py-1 pr-6 pl-1 text-caption text-fg hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-copper [&>option]:bg-surface"
        >
          {nftSortSchema.options.map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute top-1/2 right-0.5 -translate-y-1/2">
          <Icon as={ChevronDown} size={16} />
        </span>
      </span>
    </label>
  )
}
