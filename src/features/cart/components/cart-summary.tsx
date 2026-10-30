import { Link, useNavigate } from '@tanstack/react-router'
import { cn } from 'cn'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { useApplyCoupon, useRemoveCoupon } from '@/features/cart/queries'
import { isShort } from '@/features/cart/stock'
import { ApiError } from '@/shared/api/errors'
import { applyCouponSchema, type Cart } from '@/shared/contracts'
import { formatEth } from '@/shared/money'

function couponError(error: unknown) {
  if (error instanceof ApiError) return error.fields.code ?? (error.status && error.status < 500 ? error.message : null)
  return null
}

function CouponForm({ cart }: { cart: Cart }) {
  const id = useId()
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [code, setCode] = useState('')
  const [clientError, setClientError] = useState<string | null>(null)
  const error = clientError ?? (apply.isError ? (couponError(apply.error) ?? 'Não foi possível aplicar o cupom. Tente de novo.') : null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const parsed = applyCouponSchema.safeParse({ code })
    if (!parsed.success) return setClientError(parsed.error.issues[0]!.message)
    setClientError(null)
    apply.mutate(parsed.data.code, { onSuccess: () => setCode('') })
  }

  if (cart.coupon) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[5px] border border-copper/60 px-3 py-2 lg:rounded-[5px]">
        <p className="text-caption text-fg" data-testid="applied-coupon">
          Cupom <strong className="text-copper-text">{cart.coupon.code}</strong> aplicado ({cart.coupon.percent}% de desconto)
        </p>
        <button
          type="button"
          onClick={() => remove.mutate(undefined)}
          disabled={remove.isPending}
          className="shrink-0 text-caption text-copper-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-copper disabled:opacity-50"
        >
          Remover cupom
        </button>
      </div>
    )
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-caption font-bold text-fg max-lg:sr-only">
        Código promocional
      </label>
      <div
        className={cn(
          'flex h-12 overflow-hidden rounded-full border border-input bg-ink/40 focus-within:outline-2 focus-within:outline-copper lg:h-10 lg:rounded-[5px]',
          error && 'border-danger',
        )}
      >
        <input
          id={id}
          value={code}
          onChange={(event) => {
            setCode(event.target.value)
            setClientError(null)
            apply.reset()
          }}
          placeholder="Digite o código promocional..."
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="min-w-0 flex-1 bg-transparent px-4 text-caption text-fg uppercase outline-none placeholder:text-fg-secondary/80 placeholder:normal-case lg:px-2 lg:text-tiny"
        />
        <button
          type="submit"
          disabled={apply.isPending}
          className="rounded-full bg-cta-gradient px-5 text-body font-bold text-ink disabled:opacity-60 lg:rounded-none lg:bg-copper lg:bg-none lg:px-5 lg:hover:bg-copper-dark"
        >
          {apply.isPending ? 'Aplicando…' : 'Aplicar'}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-caption text-danger">
          {error}
        </p>
      )}
    </form>
  )
}

function Row({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className={cn('flex flex-col', strong && 'mt-4')}>
      <div className="flex items-baseline justify-between gap-3">
        <dt className={cn('text-body text-fg', strong && 'font-bold')}>{label}</dt>
        <dd className={cn('text-body whitespace-nowrap text-fg', strong && 'text-tab font-bold text-copper-text')}>{value}</dd>
      </div>
      {hint && <dd className="text-right text-tiny text-copper-text">{hint}</dd>}
    </div>
  )
}

/**
 * Resumo com os valores que a API calculou para o carrinho (o cliente não soma nada).
 * A cotação com a rede escolhida e a revalidação final ficam no checkout.
 */
export function CartSummary({ cart }: { cart: Cart }) {
  const navigate = useNavigate()
  const blocked = cart.items.some(isShort)

  return (
    <section
      aria-labelledby="cart-summary-title"
      className="sticky bottom-0 -mx-4 flex flex-col gap-4 rounded-t-[28px] bg-surface px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-sheet lg:static lg:mx-0 lg:gap-5 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none"
    >
      <h2 id="cart-summary-title" className="border-b border-border pb-2 text-tab font-bold text-fg max-lg:sr-only">
        Resumo da carteira
      </h2>
      <CouponForm cart={cart} />
      <dl className="flex flex-col gap-2" data-testid="cart-summary">
        <Row label="Subtotal" value={formatEth(cart.subtotalEth)} />
        <Row
          label={cart.coupon ? `Desconto (${cart.coupon.code})` : 'Desconto do lançamento'}
          value={`(-) ${formatEth(cart.discountEth)}`}
        />
        <Row label="Taxa de rede" value={formatEth(cart.estimatedNetworkFeeEth)} hint="Taxa estimada (Ethereum)" />
        <Row label="Total" value={formatEth(cart.totalEth)} strong />
      </dl>
      {blocked && (
        <p id="cart-blocked" className="text-caption text-danger">
          Ajuste os itens marcados antes de finalizar.
        </p>
      )}
      <Button
        type="button"
        disabled={blocked}
        aria-describedby={blocked ? 'cart-blocked' : undefined}
        onClick={() => void navigate({ to: '/checkout' })}
        className="h-14 rounded-full bg-cta-gradient text-body font-bold lg:h-10 lg:rounded-[5px] lg:bg-copper lg:bg-none"
      >
        Conectar e finalizar
      </Button>
      <Link to="/" hash="catalogo" className="hidden text-center text-body text-copper-text hover:underline lg:block">
        Continuar explorando
      </Link>
    </section>
  )
}
