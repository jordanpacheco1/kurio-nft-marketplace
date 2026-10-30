import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { Link, useCanGoBack, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft } from 'react-iconly'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useCurrentUser } from '@/features/auth/queries'
import { isSessionError } from '@/features/auth/session-events'
import { draftFromProfile, parseCollector } from '@/features/checkout/collector'
import { CollectorForm } from '@/features/checkout/components/collector-form'
import { QuoteSummary } from '@/features/checkout/components/quote-summary'
import { quoteQuery, useCreateOrder } from '@/features/checkout/queries'
import { quoteChanges } from '@/features/checkout/quote-diff'
import { attemptKey, loadDraft, saveDraft, type CheckoutDraft, type CollectorDraft } from '@/features/checkout/storage'
import { usePendingOrder } from '@/features/orders/pending'
import { profileQuery } from '@/features/profile/queries'
import { WalletPicker } from '@/features/wallets/components/wallet-picker'
import { walletSessionQuery, walletsQuery } from '@/features/wallets/queries'
import { ApiError } from '@/shared/api/errors'
import { NETWORK_LABELS, networkSchema, type Network, type Profile, type Quote, type Wallet, type WalletSession } from '@/shared/contracts'
import { focusFirstInvalid } from '@/shared/forms'
import { formatEth } from '@/shared/money'
import { announce } from '@/shared/ui/announcer'
import { TextField } from '@/shared/ui/form-field'
import { Icon } from '@/shared/ui/icon'
import { DESKTOP_QUERY, useMediaQuery } from '@/shared/ui/use-media-query'

/** Campo do rascunho que mostra cada erro do contrato (o ENS é digitado sem o `.eth`). */
const FIELD_OF: Record<string, keyof CollectorDraft> = { ensName: 'ensLabel' }

const MOBILE_FIELDS: { field: keyof CollectorDraft; error: string; label: string; type?: string }[] = [
  { field: 'displayName', error: 'displayName', label: 'Nome de exibição' },
  { field: 'username', error: 'username', label: 'Nome de usuário' },
  { field: 'profileName', error: 'profileName', label: 'Nome do perfil' },
  { field: 'email', error: 'email', label: 'E-mail', type: 'email' },
  { field: 'ensLabel', error: 'ensName', label: 'Nome ENS (ex.: seunome.eth)' },
]

function Top({ step, onBack }: { step: 'form' | 'review'; onBack: () => void }) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const back = () => {
    if (step === 'review') onBack()
    else if (canGoBack) router.history.back()
    else void router.navigate({ to: '/carrinho' })
  }
  return (
    <>
      <div className="relative flex h-14 items-center justify-center lg:hidden">
        <button
          type="button"
          aria-label={step === 'review' ? 'Voltar para a escolha da carteira' : 'Voltar'}
          onClick={back}
          className="absolute left-0 grid size-9 place-items-center rounded-full bg-surface-raised text-fg focus-visible:outline-2 focus-visible:outline-copper"
        >
          <Icon as={ChevronLeft} size={18} />
        </button>
        <h1 className="text-tab font-bold text-fg">Pagamento com carteira</h1>
      </div>
      <nav aria-label="Trilha" className="hidden text-body font-bold text-fg lg:block">
        <ol className="flex gap-2">
          <li>
            <Link to="/" className="hover:text-copper-text">Início</Link> /
          </li>
          <li>
            <Link to="/" hash="catalogo" className="hover:text-copper-text">Mercado</Link> /
          </li>
          <li aria-current="page">Pagamento</li>
        </ol>
      </nav>
      <h1 className="sr-only max-lg:hidden">Pagamento</h1>
    </>
  )
}

/** Mudanças entre a cotação que o usuário viu e a atual. Enquanto houver, a compra fica travada. */
function QuoteChanges({ changes, onAccept }: { changes: string[]; onAccept: () => void }) {
  if (!changes.length) return null
  return (
    <div role="alert" data-testid="quote-changes" className="flex flex-col gap-3 rounded-[5px] border border-copper/60 bg-copper/10 p-4 text-caption text-fg">
      <p className="font-bold">Os valores da compra mudaram:</p>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        {changes.map((change) => (
          <li key={change}>{change}</li>
        ))}
      </ul>
      <Button type="button" size="sm" onClick={onAccept} className="self-start">
        Aceitar novos valores
      </Button>
    </div>
  )
}

function ReviewDetails({ draft, wallet, network }: { draft: CollectorDraft; wallet: Wallet; network: Network }) {
  const parsed = parseCollector(draft)
  const rows = [
    ['Carteira', `${wallet.label} · ${wallet.address}`],
    ['Rede', NETWORK_LABELS[network]],
    ...(parsed.ok
      ? [
          ['Colecionador', `${parsed.collector.displayName} (@${parsed.collector.username})`],
          ['E-mail', parsed.collector.email],
          ['Nome ENS', parsed.collector.ensName],
        ]
      : []),
  ]
  return (
    <dl className="flex flex-col gap-3 rounded-[14px] bg-surface p-4 lg:rounded-none lg:p-6">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="text-caption text-fg-muted">{label}</dt>
          <dd className="text-body break-all text-fg">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Mensagem do erro da criação do pedido. QUOTE_STALE não aparece aqui: vira a lista de mudanças. */
function orderErrorMessage(error: unknown) {
  if (!(error instanceof ApiError) || isSessionError(error) || error.code === 'QUOTE_STALE') return null
  if (error.isTransient) {
    return 'Não tivemos resposta do servidor. Tente de novo: a compra não será duplicada.'
  }
  return error.message
}

type ScreenProps = {
  userId: string
  profile: Profile
  wallets: Wallet[]
  session: WalletSession | null
}

function CheckoutScreen({ userId, profile, wallets, session }: ScreenProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const pendingOrder = usePendingOrder(userId)
  const formRef = useRef<HTMLFormElement>(null)
  const reviewRef = useRef<HTMLHeadingElement>(null)

  // Rascunho restaurado (sessão expirada no meio do checkout) ou dados do perfil.
  const [initial] = useState<CheckoutDraft | null>(() => loadDraft(userId))
  const [draft, setDraft] = useState<CollectorDraft>(() => initial?.collector ?? draftFromProfile(profile, wallets))
  const [walletChoice, setWalletChoice] = useState<string | null>(initial?.walletId ?? null)
  const [networkChoice, setNetworkChoice] = useState<Network | null>(initial?.network ?? null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [walletError, setWalletError] = useState<string | null>(null)
  const [missingOpen, setMissingOpen] = useState(false)
  const [missing, setMissing] = useState<string[]>([])
  const [step, setStep] = useState<'form' | 'review'>('form')

  const wallet =
    wallets.find((item) => item.id === walletChoice) ??
    wallets.find((item) => item.id === session?.walletId) ??
    wallets[0] ??
    null
  const network = networkChoice ?? wallet?.network ?? 'ethereum'
  const connected = !!wallet && session?.walletId === wallet.id
  const otherWallet = wallets.find((item) => item.id !== wallet?.id) ?? null

  const quote = useQuery(quoteQuery(userId, network))
  const order = useCreateOrder(userId)

  // A cotação que o usuário viu. Se a atual mudar (socket, revalidação ou QUOTE_STALE), ele precisa aceitar.
  const [seen, setSeen] = useState<Quote | null>(null)
  if (quote.data && (!seen || seen.network !== quote.data.network)) setSeen(quote.data)
  const changes = seen && quote.data && seen.network === quote.data.network ? quoteChanges(seen, quote.data) : []
  const changesText = changes.join(' ')

  useEffect(() => {
    if (changesText) announce(`Os valores da compra mudaram. ${changesText} Revise e aceite antes de confirmar.`)
  }, [changesText])

  useEffect(() => {
    saveDraft(userId, { collector: draft, walletId: wallet?.id ?? null, network })
  }, [userId, draft, wallet?.id, network])

  const update = (field: keyof CollectorDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }))
    const errorKey = Object.keys(FIELD_OF).find((key) => FIELD_OF[key] === field) ?? field
    if (errors[errorKey]) setErrors(({ [errorKey]: _removed, ...rest }) => rest)
  }

  const selectWallet = (next: Wallet) => {
    setWalletChoice(next.id)
    setNetworkChoice(next.network)
    setWalletError(null)
  }

  const acceptChanges = () => {
    setSeen(quote.data ?? null)
    announce('Novos valores aceitos.')
  }

  // Etapa 1 → revisão: valida os dados, exige carteira conectada e revalida a cotação.
  const review = () => {
    const parsed = parseCollector(draft)
    if (!parsed.ok) {
      setErrors(parsed.errors)
      if (isDesktop) focusFirstInvalid(formRef)
      else {
        setMissing(Object.keys(parsed.errors))
        setMissingOpen(true)
      }
      return
    }
    setErrors({})
    if (!wallet) return setWalletError('Cadastre uma carteira para continuar.')
    if (!connected) return setWalletError('Conecte a carteira escolhida para continuar.')
    setStep('review')
    void quote.refetch()
    requestAnimationFrame(() => reviewRef.current?.focus())
  }

  const pay = () => {
    const parsed = parseCollector(draft)
    if (order.isPending || !quote.data || !wallet || !parsed.ok) return
    const input = { quoteId: quote.data.quoteId, walletId: wallet.id, network, collector: parsed.collector }
    order.mutate(
      { input, key: attemptKey(userId, input) },
      {
        onError: (error) => {
          if (error instanceof ApiError && error.fields.walletId) {
            setWalletError(error.message)
            setStep('form')
          }
        },
      },
    )
  }

  const backToForm = () => {
    order.reset()
    setStep('form')
  }

  const orderError = order.isError ? orderErrorMessage(order.error) : null
  const blocked = !!pendingOrder || !quote.data || quote.isError || changes.length > 0
  const total = quote.data && !quote.isError ? formatEth(quote.data.totalEth) : null

  const walletPicker = (
    <WalletPicker
      userId={userId}
      wallets={wallets}
      selectedId={wallet?.id ?? null}
      onSelect={selectWallet}
      session={session}
      network={network}
      error={walletError}
    />
  )

  const networkPicker = !isDesktop && (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-tab font-bold text-fg">Rede</legend>
      <div className="grid grid-cols-3 gap-2">
        {networkSchema.options.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-surface px-3 py-3 text-caption text-fg has-[:checked]:bg-surface-raised has-[:checked]:text-copper-text has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-copper"
          >
            <input type="radio" name="network" value={option} checked={network === option} onChange={() => setNetworkChoice(option)} className="accent-copper" />
            {NETWORK_LABELS[option]}
          </label>
        ))}
      </div>
    </fieldset>
  )

  const action =
    step === 'form' ? (
      <Button
        type="button"
        onClick={review}
        disabled={blocked}
        className="h-14 w-full rounded-full bg-cta-gradient text-body font-bold lg:h-[45px] lg:rounded-[5px] lg:bg-copper lg:bg-none"
      >
        Confirmar compra
      </Button>
    ) : (
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          onClick={pay}
          disabled={blocked || quote.isFetching || order.isPending}
          aria-describedby={quote.isFetching ? 'quote-status' : undefined}
          className="h-14 w-full rounded-full bg-cta-gradient text-body font-bold lg:h-[45px] lg:rounded-[5px] lg:bg-copper lg:bg-none"
        >
          {order.isPending ? 'Enviando pedido…' : total ? `Pagar ${total}` : 'Confirmar pagamento'}
        </Button>
        <Button type="button" variant="outline" onClick={backToForm} disabled={order.isPending} className="h-12 lg:h-10">
          Voltar e editar
        </Button>
      </div>
    )

  return (
    <div className="page-container flex flex-col gap-4 pt-4 pb-8 lg:gap-8 lg:pt-8">
      <Top step={step} onBack={backToForm} />
      {pendingOrder && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-[5px] border border-copper/60 bg-copper/10 px-4 py-3 text-caption text-fg">
          <span>Você tem um pedido em processamento. Espere a confirmação antes de comprar de novo.</span>
          <Link to="/pedidos/$orderId" params={{ orderId: pendingOrder.orderId }} className="font-bold text-copper-text hover:underline">
            Ver pedido
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_405px] lg:items-start lg:gap-8">
        <div className="flex flex-col gap-6">
          {step === 'review' && wallet ? (
            <section aria-labelledby="review-title" className="flex flex-col gap-4">
              <h2 id="review-title" ref={reviewRef} tabIndex={-1} className="text-tab font-bold text-fg outline-none">
                Revise sua compra
              </h2>
              <p className="text-caption text-fg-secondary">
                Conferimos os valores de novo agora. Se algo mudar até você confirmar, avisamos aqui.
              </p>
              <ReviewDetails draft={draft} wallet={wallet} network={network} />
            </section>
          ) : isDesktop ? (
            <CollectorForm
              formRef={formRef}
              draft={draft}
              onChange={update}
              errors={errors}
              network={network}
              onNetworkChange={setNetworkChoice}
              wallet={wallet}
              otherWallet={otherWallet}
              onUseOtherWallet={() => otherWallet && selectWallet(otherWallet)}
              onSubmit={review}
            />
          ) : (
            <>
              {walletPicker}
              {networkPicker}
            </>
          )}
        </div>

        <aside aria-label="Resumo do pagamento" className="flex flex-col gap-5">
          {(isDesktop || step === 'review') && <QuoteSummary quote={quote} />}
          {isDesktop && step === 'form' && walletPicker}
          <QuoteChanges changes={changes} onAccept={acceptChanges} />
          {!isDesktop && step === 'form' && <MobileTotal quote={quote} />}
          {quote.isFetching && step === 'review' && (
            <p id="quote-status" role="status" className="text-caption text-fg-secondary">
              Atualizando a cotação…
            </p>
          )}
          {orderError && (
            <div role="alert" data-testid="order-error" className="flex flex-col gap-2 rounded-[5px] border border-danger/60 bg-danger/10 p-3 text-caption text-fg">
              <p>{orderError}</p>
              {order.error instanceof ApiError && order.error.code === 'OUT_OF_STOCK' && (
                <Link to="/carrinho" className="font-bold text-copper-text hover:underline">
                  Ajustar o carrinho
                </Link>
              )}
            </div>
          )}
          <div className="sticky bottom-0 -mx-4 bg-ink px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] lg:static lg:mx-0 lg:bg-transparent lg:p-0">
            {action}
          </div>
        </aside>
      </div>

      <Sheet open={missingOpen} onOpenChange={setMissingOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] gap-4 overflow-y-auto rounded-t-4xl border-0 bg-surface p-6 pb-8 shadow-sheet">
          <SheetTitle className="text-tab font-bold text-fg">Complete seus dados</SheetTitle>
          <SheetDescription className="text-caption text-fg-secondary">
            O pedido usa os dados do seu perfil. Falta só isto:
          </SheetDescription>
          <form
            noValidate
            aria-label="Dados do colecionador"
            onSubmit={(event) => {
              event.preventDefault()
              const parsed = parseCollector(draft)
              if (!parsed.ok) return setErrors(parsed.errors)
              setErrors({})
              setMissingOpen(false)
              review()
            }}
            className="flex flex-col gap-3"
          >
            {MOBILE_FIELDS.filter(({ error }) => missing.includes(error)).map(({ field, error, label, type }) => (
              <TextField
                key={field}
                label={label}
                hideLabel={false}
                type={type}
                value={draft[field]}
                onChange={(event) => update(field, event.target.value)}
                error={errors[error]}
              />
            ))}
            <Button type="submit" className="h-12 rounded-full bg-cta-gradient text-body font-bold">
              Continuar
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function MobileTotal({ quote }: { quote: UseQueryResult<Quote> }) {
  if (quote.isError) return <QuoteSummary quote={quote} showLines={false} />
  return (
    <p className="flex items-baseline justify-end gap-6 text-tab font-bold text-fg" data-testid="mobile-total">
      Total:
      {quote.data ? (
        <span className="text-title text-copper-text">{formatEth(quote.data.totalEth)}</span>
      ) : (
        <span className="skeleton inline-block h-6 w-28" aria-label="Calculando o total" />
      )}
    </p>
  )
}

function CheckoutSkeleton() {
  return (
    <div className="page-container flex flex-col gap-6 pt-8" aria-busy="true" aria-label="Carregando pagamento">
      <div className="skeleton h-6 w-48" />
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_405px] lg:gap-8">
        <div className="skeleton h-[420px]" />
        <div className="skeleton h-[420px]" />
      </div>
    </div>
  )
}

export function CheckoutPage() {
  const { user } = useCurrentUser()
  const userId = user?.id ?? ''
  const profile = useQuery({ ...profileQuery(userId), enabled: !!user })
  const wallets = useQuery({ ...walletsQuery(userId), enabled: !!user })
  const session = useQuery({ ...walletSessionQuery(userId), enabled: !!user })

  if (!user || profile.isPending || wallets.isPending || session.isPending) return <CheckoutSkeleton />
  if (profile.isError || wallets.isError || session.isError) {
    const retry = () => {
      void profile.refetch()
      void wallets.refetch()
      void session.refetch()
    }
    return (
      <div role="alert" className="page-container flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-body text-fg">Não foi possível carregar o pagamento.</p>
        <Button onClick={retry}>Tentar de novo</Button>
      </div>
    )
  }
  return <CheckoutScreen userId={user.id} profile={profile.data} wallets={wallets.data} session={session.data} />
}
