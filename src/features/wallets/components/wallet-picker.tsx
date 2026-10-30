import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useConnectWallet, useDisconnectWallet } from '@/features/wallets/queries'
import { isSessionError } from '@/features/auth/session-events'
import { ApiError } from '@/shared/api/errors'
import { NETWORK_LABELS, WALLET_PROVIDER_LABELS, type Network, type Wallet, type WalletSession } from '@/shared/contracts'

const shortAddress = (address: string) => (address.startsWith('0x') ? `${address.slice(0, 6)}…${address.slice(-4)}` : address)

type Props = {
  userId: string
  wallets: Wallet[]
  selectedId: string | null
  onSelect: (wallet: Wallet) => void
  session: WalletSession | null
  network: Network
  /** Erro vindo da tentativa de compra (ex.: carteira desconectada). */
  error?: string | null
}

/**
 * Carteiras cadastradas (rádios) + conexão simulada com a extensão: conectar, recusada no
 * cenário `wallet-rejected`, e desconectar. A compra só segue com a carteira escolhida conectada.
 */
export function WalletPicker({ userId, wallets, selectedId, onSelect, session, network, error }: Props) {
  const connect = useConnectWallet(userId)
  const disconnect = useDisconnectWallet(userId)
  const selected = wallets.find((wallet) => wallet.id === selectedId) ?? null
  const connected = !!selected && session?.walletId === selected.id

  const connectError =
    connect.isError && !isSessionError(connect.error)
      ? connect.error instanceof ApiError && connect.error.code === 'FORBIDDEN'
        ? 'A conexão foi recusada na carteira. Aprove o pedido na extensão e tente de novo.'
        : 'Não foi possível conectar a carteira. Tente de novo.'
      : null
  const message = connectError ?? error ?? null

  if (!wallets.length) {
    return (
      <section aria-labelledby="wallets-title" className="flex flex-col gap-3">
        <h2 id="wallets-title" className="text-tab font-bold text-fg">
          Carteira e rede
        </h2>
        <p className="text-caption text-fg-secondary">Você ainda não tem carteira cadastrada.</p>
        <Button asChild variant="outline" className="self-start">
          <Link to="/perfil/carteiras">Cadastrar carteira</Link>
        </Button>
      </section>
    )
  }

  return (
    <section aria-labelledby="wallets-title" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="wallets-title" className="text-tab font-bold text-fg">
          Carteira e rede
        </h2>
        <Link to="/perfil/carteiras" className="text-caption font-bold text-copper-text hover:underline">
          Gerenciar carteiras
        </Link>
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Escolha a carteira de pagamento</legend>
        {wallets.map((wallet) => {
          const isConnected = session?.walletId === wallet.id
          return (
            <label
              key={wallet.id}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-[14px] border border-transparent bg-surface p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-copper lg:rounded-none lg:border-line-strong',
                wallet.id === selectedId && 'border-copper lg:border-fg',
              )}
            >
              <input
                type="radio"
                name="wallet"
                value={wallet.id}
                checked={wallet.id === selectedId}
                onChange={() => {
                  connect.reset()
                  onSelect(wallet)
                }}
                className="mt-1 size-4 accent-copper"
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 text-body font-bold text-fg">
                  {wallet.label}
                  <span className="rounded-full bg-surface-raised px-2 py-0.5 text-tiny font-normal text-copper-text">
                    {WALLET_PROVIDER_LABELS[wallet.provider]}
                  </span>
                  {isConnected && (
                    <span className="rounded-full border border-success px-2 py-0.5 text-tiny font-normal text-fg">Conectada</span>
                  )}
                </span>
                <span className="truncate text-caption text-fg-secondary" title={wallet.address}>
                  {shortAddress(wallet.address)}
                </span>
                <span className="text-caption text-fg-muted">Rede {NETWORK_LABELS[wallet.network]}</span>
              </span>
            </label>
          )
        })}
      </fieldset>

      {selected && (
        <div className="flex flex-wrap items-center justify-between gap-3" data-testid="wallet-connection">
          <p className="text-caption text-fg-secondary">
            {connected
              ? `${selected.label} conectada via ${WALLET_PROVIDER_LABELS[selected.provider]}.`
              : `Conecte a ${selected.label} para pagar na rede ${NETWORK_LABELS[network]}.`}
          </p>
          {connected ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disconnect.isPending}
              onClick={() => session && disconnect.mutate(session)}
            >
              Desconectar
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={connect.isPending}
              onClick={() => connect.mutate({ walletId: selected.id, network, label: selected.label })}
            >
              {connect.isPending ? 'Conectando…' : `Conectar ${WALLET_PROVIDER_LABELS[selected.provider]}`}
            </Button>
          )}
        </div>
      )}
      {message && (
        <p role="alert" data-testid="wallet-error" className="text-caption text-danger">
          {message}
        </p>
      )}
    </section>
  )
}
