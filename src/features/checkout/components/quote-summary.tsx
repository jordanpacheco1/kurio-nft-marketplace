import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/shared/api/errors'
import { NETWORK_LABELS, type Quote } from '@/shared/contracts'
import { formatEth } from '@/shared/money'
import { NftImage } from '@/shared/ui/nft-image'

function Row({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className={cn('flex flex-col', strong && 'mt-2 border-t border-line-strong pt-3')}>
      <div className="flex items-baseline justify-between gap-3">
        <dt className={cn('text-body text-fg', strong && 'font-bold')}>{label}</dt>
        <dd className={cn('text-body whitespace-nowrap text-fg', strong && 'text-tab font-bold text-copper-text')}>{value}</dd>
      </div>
      {hint && <dd className="text-center text-tiny text-copper-text">{hint}</dd>}
    </div>
  )
}

export function QuoteTotals({ quote }: { quote: Quote }) {
  return (
    <dl className="flex flex-col gap-2" data-testid="quote-summary">
      <Row label="Subtotal" value={formatEth(quote.subtotalEth)} />
      <Row label={quote.coupon ? `Desconto (${quote.coupon.code})` : 'Desconto do lançamento'} value={`(-) ${formatEth(quote.discountEth)}`} />
      <Row label="Taxa de rede" value={formatEth(quote.networkFeeEth)} hint={`Taxa da rede ${NETWORK_LABELS[quote.network]}`} />
      <Row label="Total" value={formatEth(quote.totalEth)} strong />
    </dl>
  )
}

function Lines({ quote }: { quote: Quote }) {
  return (
    <ul className="flex flex-col gap-3" aria-label="Itens da compra">
      {quote.lines.map((line) => (
        <li key={line.itemId} data-testid="quote-line" className="flex items-center gap-3 bg-surface p-1 pr-3">
          <div className="w-[70px] shrink-0">
            <NftImage image={line.image} sizes="70px" alt="" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-bold text-fg">{line.name}</p>
            <p className="text-tiny text-fg-muted">
              ID do token: {line.tokenId} · {line.editionLabel}
            </p>
          </div>
          <span className="text-caption text-fg-secondary">(x {line.quantity})</span>
          <span className="text-body font-bold whitespace-nowrap text-copper-text">{formatEth(line.lineTotalEth)}</span>
        </li>
      ))}
    </ul>
  )
}

export function QuoteSkeleton() {
  return (
    <div aria-busy="true" aria-label="Calculando a cotação" className="flex flex-col gap-3">
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="skeleton h-[78px]" />
      ))}
      <div className="skeleton h-40" />
    </div>
  )
}

/** Erro da cotação: carrinho vazio ou item sem estoque bloqueiam a compra; o resto pode ser repetido. */
export function QuoteError({ error, onRetry, retrying }: { error: unknown; onRetry: () => void; retrying: boolean }) {
  const code = error instanceof ApiError ? error.code : null
  if (code === 'OUT_OF_STOCK' || code === 'VALIDATION_ERROR') {
    return (
      <div role="alert" data-testid="quote-error" className="flex flex-col gap-3 rounded-[5px] border border-danger/60 bg-danger/10 p-4 text-caption text-fg">
        <p>{(error as ApiError).message}</p>
        <Link to="/carrinho" className="font-bold text-copper-text hover:underline">
          Ajustar o carrinho
        </Link>
      </div>
    )
  }
  return (
    <div role="alert" data-testid="quote-error" className="flex flex-col items-start gap-3 text-caption text-fg">
      <p>Não foi possível calcular a cotação.</p>
      <Button size="sm" onClick={onRetry} disabled={retrying}>
        Tentar de novo
      </Button>
    </div>
  )
}

/** "Seus NFTs": linhas e totais da cotação (os valores que o pedido vai usar). */
export function QuoteSummary({ quote, showLines = true }: { quote: UseQueryResult<Quote>; showLines?: boolean }) {
  return (
    <section aria-labelledby="quote-title" aria-busy={quote.isFetching || undefined} className="flex flex-col gap-3">
      <h2 id="quote-title" className="text-tab font-bold text-fg">
        Seus NFTs
      </h2>
      {quote.isError ? (
        <QuoteError error={quote.error} onRetry={() => void quote.refetch()} retrying={quote.isFetching} />
      ) : !quote.data ? (
        <QuoteSkeleton />
      ) : (
        <>
          {showLines && (
            <>
              <div className="flex justify-between border-b border-line-strong pb-1 text-body font-bold text-fg" aria-hidden="true">
                <span>NFTs</span>
                <span>Subtotal</span>
              </div>
              <Lines quote={quote.data} />
            </>
          )}
          {!quote.data.coupon && (
            <p className="text-center text-caption text-fg">
              Tem um código promocional?{' '}
              <Link to="/carrinho" className="text-copper-text hover:underline">
                Aplique no carrinho
              </Link>
            </p>
          )}
          <QuoteTotals quote={quote.data} />
        </>
      )}
    </section>
  )
}
