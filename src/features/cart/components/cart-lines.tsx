import { Link } from '@tanstack/react-router'
import { Delete } from 'react-iconly'
import { useRemoveCartItem, useUpdateCartItem } from '@/features/cart/queries'
import { isShort } from '@/features/cart/stock'
import { QuantityStepper } from '@/features/nft/components/purchase-controls'
import { MAX_QUANTITY_PER_ITEM, type CartItem } from '@/shared/contracts'
import { formatEth } from '@/shared/money'
import { Icon } from '@/shared/ui/icon'
import { NftImage } from '@/shared/ui/nft-image'

function StockWarning({ item }: { item: CartItem }) {
  if (!isShort(item)) return null
  return (
    <p className="text-caption text-danger">
      <span aria-hidden="true">⚠ </span>
      {item.available === 0
        ? 'Esgotou. Remova o item para continuar.'
        : `Só restam ${item.available}. Ajuste a quantidade para continuar.`}
    </p>
  )
}

/** Mutations da linha: cada linha trava só os próprios controles enquanto espera a API. */
function useLine(item: CartItem) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const busy = update.isPending || remove.isPending
  // Diminuir sempre pode (é como se resolve um estoque que caiu); aumentar, até o estoque e o limite.
  const max = Math.max(item.quantity, Math.min(item.available, MAX_QUANTITY_PER_ITEM))
  const canIncrease = item.quantity < Math.min(item.available, MAX_QUANTITY_PER_ITEM)
  return {
    busy,
    max: canIncrease ? max : item.quantity,
    setQuantity: (quantity: number) => update.mutate({ item, quantity }),
    remove: () => remove.mutate(item),
  }
}

const removeClass =
  'grid size-9 place-items-center rounded-full text-copper-text hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-copper disabled:opacity-40'

function DesktopRow({ item }: { item: CartItem }) {
  const line = useLine(item)
  return (
    <tr data-testid="cart-line" aria-busy={line.busy} className="bg-surface align-middle">
      <td className="py-0 pr-4">
        <div className="flex min-w-0 items-center gap-4">
          <NftImage image={item.image} sizes="70px" className="size-[70px] shrink-0" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <Link to="/nft/$nftId" params={{ nftId: item.nftId }} search={{ edition: item.editionId }} className="truncate text-body font-bold text-fg hover:text-copper-text">
              {item.name}
            </Link>
            <span className="truncate text-caption text-fg-muted">
              ID do token: {item.tokenId} · {item.editionLabel}
            </span>
            <StockWarning item={item} />
          </div>
        </div>
      </td>
      <td className="text-body font-medium text-fg-secondary">{formatEth(item.unitPriceEth)}</td>
      <td>
        <QuantityStepper
          value={item.quantity}
          max={line.max}
          onChange={line.setQuantity}
          disabled={line.busy}
          itemName={`${item.name} (${item.editionLabel})`}
          className="[&_button]:size-6 [&_button]:lg:size-6 [&_output]:text-body"
        />
      </td>
      <td className="text-body font-bold text-copper-text">{formatEth(item.lineTotalEth)}</td>
      <td className="pr-4 text-right">
        <button type="button" onClick={line.remove} disabled={line.busy} aria-label={`Remover ${item.name} (${item.editionLabel})`} className={removeClass}>
          <Icon as={Delete} size={22} />
        </button>
      </td>
    </tr>
  )
}

export function CartTable({ items }: { items: CartItem[] }) {
  const th = 'pb-3 text-left text-body font-bold text-fg'
  return (
    <table className="w-full table-fixed border-separate border-spacing-y-3">
      <caption className="sr-only">Itens do carrinho</caption>
      {/* Larguras do Figma: o nome não espreme as colunas de valores. */}
      <colgroup>
        <col />
        <col className="w-[140px]" />
        <col className="w-[136px]" />
        <col className="w-[150px]" />
        <col className="w-[60px]" />
      </colgroup>
      <thead>
        <tr className="[&>th]:border-b [&>th]:border-border">
          <th scope="col" className={th}>NFTs</th>
          <th scope="col" className={th}>Preço</th>
          <th scope="col" className={th}>Edições</th>
          <th scope="col" className={th}>Total</th>
          <th scope="col" className={th}>
            <span className="sr-only">Remover</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <DesktopRow key={item.id} item={item} />
        ))}
      </tbody>
    </table>
  )
}

function MobileCard({ item }: { item: CartItem }) {
  const line = useLine(item)
  return (
    <li data-testid="cart-line" aria-busy={line.busy} className="flex gap-3 overflow-hidden rounded-[14px] bg-surface pr-3 shadow-float">
      <NftImage image={item.image} sizes="100px" className="size-[100px] shrink-0 rounded-[14px]" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-2">
        <Link to="/nft/$nftId" params={{ nftId: item.nftId }} search={{ edition: item.editionId }} className="truncate text-body font-bold text-fg">
          {item.name}
        </Link>
        <span className="text-caption text-fg-secondary">Edição: {item.editionLabel}</span>
        <span className="text-tab font-bold text-copper-text">{formatEth(item.lineTotalEth)}</span>
        <StockWarning item={item} />
      </div>
      <div className="flex flex-col items-end justify-center gap-1">
        <button type="button" onClick={line.remove} disabled={line.busy} aria-label={`Remover ${item.name} (${item.editionLabel})`} className={`${removeClass} size-8`}>
          <Icon as={Delete} size={18} />
        </button>
        <QuantityStepper
          value={item.quantity}
          max={line.max}
          onChange={line.setQuantity}
          disabled={line.busy}
          itemName={`${item.name} (${item.editionLabel})`}
          className="gap-2 [&_button]:size-6 [&_button]:bg-surface-raised [&_button]:text-fg [&_output]:text-body"
        />
      </div>
    </li>
  )
}

export function CartCards({ items }: { items: CartItem[] }) {
  return (
    <ul aria-label="Itens do carrinho" className="flex flex-col gap-4">
      {items.map((item) => (
        <MobileCard key={item.id} item={item} />
      ))}
    </ul>
  )
}
