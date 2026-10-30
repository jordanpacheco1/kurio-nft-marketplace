import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useHomeSearch } from '@/features/catalog/use-home-search'
import type { NftList } from '@/shared/contracts'

const PRICE_FLOOR = 0.02
const PRICE_CEIL = 12.3

const formatPrice = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type Facets = NftList['facets'] | undefined

/** Coleções, faixa de preço e rede. Usado na sidebar do desktop e no sheet do mobile. */
export function CatalogFilters({ facets }: { facets: Facets }) {
  const { search, update } = useHomeSearch()

  const toggle = <T extends string>(list: T[], id: T) =>
    list.includes(id) ? list.filter((item) => item !== id) : [...list, id]

  return (
    <div className="flex flex-col gap-6">
      <FilterGroup title="Coleções" loading={!facets} rows={9}>
        {facets?.collections.map((facet) => (
          <CheckRow
            key={facet.id}
            label={facet.label}
            count={facet.count}
            checked={search.collections.includes(facet.id)}
            onChange={() => void update({ collections: toggle(search.collections, facet.id) })}
          />
        ))}
      </FilterGroup>

      <PriceFilter
        // Remonta quando a URL muda (ex.: "Limpar filtros"), para o slider refletir o valor aplicado.
        key={`${search.min ?? ''}-${search.max ?? ''}`}
        floor={facets ? Number(facets.price.min) : PRICE_FLOOR}
        ceil={facets ? Number(facets.price.max) : PRICE_CEIL}
        min={search.min}
        max={search.max}
        onApply={(min, max) => void update({ min, max })}
      />

      <FilterGroup title="Rede" loading={!facets} rows={3}>
        {facets?.networks.map((facet) => (
          <CheckRow
            key={facet.id}
            label={facet.label}
            count={facet.count}
            checked={search.networks.includes(facet.id)}
            onChange={() => void update({ networks: toggle(search.networks, facet.id) })}
          />
        ))}
      </FilterGroup>
    </div>
  )
}

function FilterGroup({ title, loading, rows, children }: { title: string; loading: boolean; rows: number; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-2 text-body font-medium text-fg">{title}</legend>
      {loading
        ? Array.from({ length: rows }, (_, i) => <div key={i} aria-hidden="true" className="skeleton my-1 h-6 w-full" />)
        : children}
    </fieldset>
  )
}

function CheckRow({ label, count, checked, onChange }: { label: string; count: number; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-caption text-copper-text hover:bg-surface-raised has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-copper">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-3.5 shrink-0 accent-copper focus-visible:outline-none"
      />
      <span className={checked ? 'font-bold text-fg' : undefined}>{label}</span>
      <span className="ml-auto text-fg-muted" aria-label={`${count} itens`}>
        ({count})
      </span>
    </label>
  )
}

type PriceProps = { floor: number; ceil: number; min?: number; max?: number; onApply: (min?: number, max?: number) => void }

function PriceFilter({ floor, ceil, min, max, onApply }: PriceProps) {
  const [range, setRange] = useState<number[]>([min ?? floor, max ?? ceil])
  const [low, high] = range as [number, number]

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-body font-medium text-fg">Faixa de preço</legend>
      <Slider
        min={floor}
        max={ceil}
        step={0.01}
        value={range}
        onValueChange={setRange}
        minStepsBetweenThumbs={1}
        thumbLabels={['Preço mínimo em ETH', 'Preço máximo em ETH']}
        className="[&_[data-slot=slider-range]]:bg-copper [&_[data-slot=slider-thumb]]:border-ink [&_[data-slot=slider-thumb]]:bg-copper [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-line-strong"
      />
      <p className="text-caption text-fg-secondary" aria-live="polite">
        Preço: {formatPrice(low)} - {formatPrice(high)} ETH
      </p>
      <Button
        type="button"
        size="xs"
        className="w-fit px-3 text-caption"
        onClick={() => onApply(low > floor ? low : undefined, high < ceil ? high : undefined)}
      >
        Aplicar
      </Button>
    </fieldset>
  )
}
