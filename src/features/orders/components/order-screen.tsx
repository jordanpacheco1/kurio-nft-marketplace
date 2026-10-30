import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useCurrentUser } from '@/features/auth/queries'
import { orderQuery } from '@/features/orders/queries'
import { ApiError } from '@/shared/api/errors'
import { NETWORK_LABELS, WALLET_PROVIDER_LABELS, type Network, type Order, type Receipt } from '@/shared/contracts'
import { compareEth, formatEth } from '@/shared/money'
import { NftImage } from '@/shared/ui/nft-image'

const EXPLORER_NAMES: Record<Network, string> = { ethereum: 'Etherscan', polygon: 'Polygonscan', solana: 'Solscan' }

const shortHash = (hash: string) => `${hash.slice(0, 6)}…${hash.slice(-4)}`
/** "30 out, 2026", no formato curto do Figma ("29 Jul, 2026"). */
function formatDate(iso: string) {
  const date = new Date(iso)
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '')
  return `${String(date.getDate()).padStart(2, '0')} ${month}, ${date.getFullYear()}`
}

/** Envelope "Thank you" do Figma, desenhado em SVG (decorativo). */
function ThankYouIcon() {
  return (
    <svg aria-hidden="true" width="68" height="80" viewBox="0 0 68 80" fill="none" className="text-copper-text">
      <path d="M8 34 34 4l26 30" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="8" y="10" width="52" height="38" rx="3" fill="var(--color-surface)" stroke="currentColor" strokeWidth="2.5" />
      <text x="34" y="27" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">THANK</text>
      <text x="34" y="40" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">YOU</text>
      <path d="M2 34v42h64V34L34 58 2 34Z" fill="var(--color-surface)" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M2 76 28 54M66 76 40 54" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  )
}

function ReceiptView({ order, receipt }: { order: Order; receipt: Receipt }) {
  const facts = [
    { label: 'ID da transação', value: shortHash(receipt.transactionHash), strong: true },
    { label: 'Data', value: formatDate(receipt.confirmedAt) },
    { label: 'Total', value: formatEth(receipt.totalEth) },
    { label: 'Carteira', value: WALLET_PROVIDER_LABELS[receipt.wallet.provider], strong: true },
  ]
  return (
    <div data-testid="receipt" className="flex flex-col">
      <div className="flex flex-col items-center gap-4 px-6 pt-6 pb-5 text-center">
        <ThankYouIcon />
        <DialogTitle className="text-body font-bold text-fg-secondary">Seus NFTs agora estão na sua carteira</DialogTitle>
        <DialogDescription className="sr-only">Recibo do pedido {order.id}</DialogDescription>
      </div>
      <dl className="grid grid-cols-2 gap-y-3 border-y border-copper px-6 py-3 text-caption sm:grid-cols-4 sm:px-9">
        {facts.map((fact, index) => (
          <div key={fact.label} className={index > 0 ? 'sm:border-l sm:border-copper sm:pl-4' : undefined}>
            <dt className={fact.strong ? 'font-bold text-fg-secondary' : 'text-fg-secondary'}>{fact.label}</dt>
            <dd className="whitespace-nowrap text-fg-secondary" title={fact.label === 'ID da transação' ? receipt.transactionHash : undefined}>
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col px-6 pt-6 pb-8 sm:px-11">
        <h3 className="text-caption font-bold text-fg">Detalhes da transação</h3>
        <table className="mt-2 w-full text-left text-body">
          <thead>
            <tr className="border-b border-line-strong text-fg">
              <th scope="col" className="pb-2 font-bold">NFTs</th>
              <th scope="col" className="pb-2 text-center font-bold">Edições</th>
              <th scope="col" className="pb-2 text-right font-bold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {receipt.lines.map((line) => (
              <tr key={`${line.nftId}:${line.editionId}`} data-testid="receipt-line">
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-14 shrink-0 overflow-hidden rounded-[5px] sm:w-[70px]">
                      <NftImage image={line.image} sizes="70px" alt="" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-fg">{line.name}</p>
                      <p className="text-caption text-fg-muted">ID do token: {line.tokenId} · {line.editionLabel}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2 text-center text-fg-secondary">(x {line.quantity})</td>
                <td className="py-2 text-right font-bold whitespace-nowrap text-copper-text">{formatEth(line.lineTotalEth)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-3 ml-auto flex w-full max-w-[320px] flex-col gap-1 border-b border-line-strong pb-2 text-body">
          {compareEth(receipt.discountEth, '0') > 0 && (
            <div className="flex justify-between">
              <dt className="text-fg">Desconto{receipt.coupon ? ` (${receipt.coupon.code})` : ''}</dt>
              <dd className="text-fg">(-) {formatEth(receipt.discountEth)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-fg">Taxa de rede</dt>
            <dd className="text-fg">{formatEth(receipt.networkFeeEth)}</dd>
          </div>
          <div className="flex justify-between text-tab font-bold">
            <dt className="text-fg">Total</dt>
            <dd className="text-copper-text">{formatEth(receipt.totalEth)}</dd>
          </div>
        </dl>
        <p className="mx-auto mt-4 max-w-[460px] text-center text-caption text-fg-secondary">
          Transação confirmada na {NETWORK_LABELS[receipt.network]}. A propriedade foi transferida para sua carteira{' '}
          {receipt.wallet.label} e registrada na rede.
        </p>
        <Button asChild className="mx-auto mt-5 h-12 px-4 text-body font-bold">
          <a href={receipt.explorerUrl} target="_blank" rel="noopener noreferrer">
            Ver no {EXPLORER_NAMES[receipt.network]}
            <span className="sr-only"> (abre em nova aba, link simulado)</span>
          </a>
        </Button>
      </div>
    </div>
  )
}

function StatusView({ title, children, busy }: { title: string; children: React.ReactNode; busy?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center sm:px-12" aria-busy={busy || undefined}>
      {busy && <span aria-hidden="true" className="size-10 animate-spin rounded-full border-4 border-copper/30 border-t-copper motion-reduce:animate-none" />}
      <DialogTitle className="text-tab font-bold text-fg">{title}</DialogTitle>
      {children}
    </div>
  )
}

function OrderBody({ userId, orderId }: { userId: string; orderId: string }) {
  const order = useQuery(orderQuery(userId, orderId))

  if (order.isPending) {
    return (
      <StatusView title="Carregando pedido" busy>
        <DialogDescription className="sr-only">Buscando o status do pedido.</DialogDescription>
      </StatusView>
    )
  }
  if (order.isError) {
    const missing = order.error instanceof ApiError && (order.error.code === 'NOT_FOUND' || order.error.code === 'FORBIDDEN')
    return (
      <StatusView title={missing ? 'Pedido não encontrado' : 'Não foi possível carregar o pedido'}>
        <DialogDescription className="text-caption text-fg-secondary">
          {missing ? 'Confira o link ou veja seus pedidos no perfil.' : 'Verifique a conexão e tente de novo.'}
        </DialogDescription>
        {!missing && (
          <Button onClick={() => void order.refetch()} disabled={order.isFetching}>
            Tentar de novo
          </Button>
        )}
      </StatusView>
    )
  }

  const data = order.data
  if (data.status === 'confirmed' && data.receipt) return <ReceiptView order={data} receipt={data.receipt} />

  if (data.status === 'declined') {
    return (
      <StatusView title="Pagamento recusado">
        <DialogDescription asChild>
          <div className="flex flex-col gap-2 text-caption text-fg-secondary">
            <p role="alert" className="text-fg">{data.declineReason ?? 'A carteira recusou o pagamento.'}</p>
            <p>Nenhum valor foi cobrado e o seu carrinho não mudou.</p>
          </div>
        </DialogDescription>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/checkout">Tentar de novo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/carrinho">Ir para o carrinho</Link>
          </Button>
        </div>
      </StatusView>
    )
  }

  return (
    <StatusView title="Processando pagamento" busy>
      <DialogDescription className="max-w-[360px] text-caption text-fg-secondary">
        Aguardando a confirmação da rede {NETWORK_LABELS[data.network]} para {data.itemCount}{' '}
        {data.itemCount === 1 ? 'item' : 'itens'} ({formatEth(data.totalEth)}). Pode fechar esta janela: o pedido
        continua e avisamos quando terminar.
      </DialogDescription>
    </StatusView>
  )
}

/** Pedido em `/pedidos/$orderId`: pendente, recusado ou o recibo (o modal de confirmação do Figma). */
export function OrderScreen({ orderId }: { orderId: string }) {
  const { user } = useCurrentUser()
  const navigate = useNavigate()

  return (
    <Dialog open onOpenChange={(open) => !open && void navigate({ to: '/' })}>
      <DialogContent
        data-testid="order-dialog"
        className="max-h-[calc(100dvh-2rem)] max-w-[578px] gap-0 overflow-y-auto rounded-none border-0 border-b-[10px] border-b-copper bg-surface p-0 sm:max-w-[578px] [&>button:last-child]:text-copper-text"
      >
        {user ? (
          <OrderBody userId={user.id} orderId={orderId} />
        ) : (
          <StatusView title="Carregando pedido" busy>
            <DialogDescription className="sr-only">Conferindo a sessão.</DialogDescription>
          </StatusView>
        )}
      </DialogContent>
    </Dialog>
  )
}
