import { cn } from '@/lib/utils'
import { MinusIcon, PlusIcon } from 'lucide-react'
import type { Edition } from '@/shared/contracts'

/** Edições como grupo de rádios (pílulas). Esgotada fica riscada e com o texto "esgotada", não só cor. */
export function EditionPicker({
  editions,
  selectedId,
  onSelect,
}: {
  editions: Edition[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-body font-bold text-fg">Edição:</legend>
      <div className="flex flex-wrap gap-2">
        {editions.map((edition) => {
          const soldOut = edition.available === 0
          return (
            <label
              key={edition.id}
              className={cn(
                'cursor-pointer rounded-full border border-line-strong px-2.5 py-1 text-caption text-fg-secondary uppercase hover:border-copper',
                'has-[:checked]:border-copper has-[:checked]:font-bold has-[:checked]:text-fg',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-copper',
                soldOut && 'line-through decoration-fg-muted',
              )}
            >
              <input
                type="radio"
                name="edition"
                value={edition.id}
                checked={edition.id === selectedId}
                onChange={() => onSelect(edition.id)}
                className="sr-only"
              />
              {edition.label}
              {soldOut && <span className="sr-only"> (esgotada)</span>}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

const stepClass =
  'grid size-7 place-items-center rounded-full bg-copper text-ink hover:bg-copper-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper disabled:cursor-not-allowed disabled:opacity-40 lg:size-9'

/**
 * Quantidade com −/+. O limite é o menor entre o estoque e 10 por item.
 * Com `itemName` (várias linhas na tela, como no carrinho), os nomes acessíveis citam o item.
 */
export function QuantityStepper({
  value,
  max,
  onChange,
  disabled,
  itemName,
  className,
}: {
  value: number
  max: number
  onChange: (value: number) => void
  disabled?: boolean
  itemName?: string
  className?: string
}) {
  const of = itemName ? ` de ${itemName}` : ''
  return (
    <div role="group" aria-label={`Quantidade${of}`} className={cn('flex items-center gap-3', className)}>
      <button
        type="button"
        className={stepClass}
        aria-label={`Diminuir quantidade${of}`}
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <MinusIcon aria-hidden="true" className="size-4 lg:size-5" strokeWidth={2.5} />
      </button>
      <output aria-live="polite" aria-label={`Quantidade${of}: ${value}`} className="min-w-4 text-center text-lg text-fg">
        {value}
      </output>
      <button
        type="button"
        className={stepClass}
        aria-label={`Aumentar quantidade${of}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        <PlusIcon aria-hidden="true" className="size-4 lg:size-5" strokeWidth={2.5} />
      </button>
    </div>
  )
}
