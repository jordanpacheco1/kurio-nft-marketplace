import { useQuery } from '@tanstack/react-query'
import { useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/queries'
import { isSessionError } from '@/features/auth/session-events'
import { useSaveWallet, walletsQuery } from '@/features/wallets/queries'
import { ApiError } from '@/shared/api/errors'
import {
  NETWORK_LABELS,
  WALLET_PROVIDER_LABELS,
  networkSchema,
  walletInputSchema,
  walletProviderSchema,
  type Wallet,
  type WalletSlot,
} from '@/shared/contracts'
import { focusFirstInvalid, zodFieldErrors } from '@/shared/forms'
import { announce } from '@/shared/ui/announcer'
import { FormField, inputClass } from '@/shared/ui/form-field'

type Draft = { label: string; network: string; address: string; provider: string }

const EMPTY: Draft = { label: '', network: '', address: '', provider: '' }

// Mesmo contrato da API, com mensagens para os selects ainda vazios.
const walletFormSchema = walletInputSchema.omit({ slot: true }).extend({
  network: z.enum(networkSchema.options, { error: 'Selecione uma rede' }),
  provider: z.enum(walletProviderSchema.options, { error: 'Selecione o tipo de carteira' }),
})

const draftFrom = (wallet: Wallet): Draft => ({
  label: wallet.label,
  network: wallet.network,
  address: wallet.address,
  provider: wallet.provider,
})

const selectClass = `${inputClass} text-copper-text`

export function WalletsPage() {
  const { user } = useCurrentUser()
  const wallets = useQuery({ ...walletsQuery(user?.id ?? ''), enabled: !!user })

  if (!user || wallets.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando carteiras">
        <div className="skeleton h-5 w-48" />
        <div className="grid gap-x-7 gap-y-5 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton h-12 lg:h-10" />
          ))}
        </div>
      </div>
    )
  }
  if (wallets.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-4 py-8">
        <p className="text-body text-fg">Não foi possível carregar suas carteiras.</p>
        <Button variant="outline" onClick={() => wallets.refetch()}>
          Tentar de novo
        </Button>
      </div>
    )
  }

  const primary = wallets.data.find((wallet) => wallet.slot === 'primary') ?? null
  const secondary = wallets.data.find((wallet) => wallet.slot === 'secondary') ?? null

  return (
    <div className="flex flex-col gap-10">
      <h1 className="sr-only">Carteiras</h1>
      <section aria-labelledby="primary-title" className="flex flex-col gap-5">
        <header className="flex flex-col gap-1">
          <h2 id="primary-title" className="text-tab font-bold text-fg">
            Carteira principal
          </h2>
          <p className="text-caption text-fg-secondary">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
        </header>
        <WalletForm key={primary?.id ?? 'new-primary'} userId={user.id} slot="primary" wallet={primary} />
      </section>

      <SecondarySection key={secondary?.id ?? 'new-secondary'} userId={user.id} primary={primary} secondary={secondary} />
    </div>
  )
}

/** Secundária: "Adicionar" abre o formulário; "Igual à carteira principal" o preenche com a principal. */
function SecondarySection({ userId, primary, secondary }: { userId: string; primary: Wallet | null; secondary: Wallet | null }) {
  const [open, setOpen] = useState(!!secondary)
  const [copy, setCopy] = useState<{ draft: Draft; version: number } | null>(null)

  const copyPrimary = (checked: boolean) => {
    if (!primary) return
    setOpen(true)
    setCopy(checked ? { draft: { ...draftFrom(primary), label: secondary?.label ?? '' }, version: (copy?.version ?? 0) + 1 } : null)
    if (checked) announce('Formulário da carteira secundária preenchido com a principal')
  }

  return (
    <section aria-labelledby="secondary-title" className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1">
          <h2 id="secondary-title" className="text-tab font-bold text-fg">
            Carteira secundária
          </h2>
          {!open && <p className="text-caption text-fg-secondary">Você ainda não adicionou uma carteira secundária.</p>}
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-caption text-fg has-disabled:opacity-60">
            <input
              type="checkbox"
              checked={!!copy}
              disabled={!primary}
              onChange={(event) => copyPrimary(event.target.checked)}
              className="size-4 accent-copper"
            />
            Igual à carteira principal
          </label>
          {!open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-tab font-bold text-copper-text hover:underline focus-visible:outline-2 focus-visible:outline-copper"
            >
              Adicionar<span className="sr-only"> carteira secundária</span>
            </button>
          )}
        </div>
      </header>
      {open && (
        <WalletForm
          key={copy?.version ?? 0}
          userId={userId}
          slot="secondary"
          wallet={secondary}
          initial={copy?.draft}
          autoFocus={!secondary}
        />
      )}
    </section>
  )
}

type FormProps = {
  userId: string
  slot: WalletSlot
  wallet: Wallet | null
  /** Valores iniciais diferentes dos da carteira salva (ex.: copiados da principal). */
  initial?: Draft
  autoFocus?: boolean
}

function WalletForm({ userId, slot, wallet, initial, autoFocus }: FormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState<Draft>(() => initial ?? (wallet ? draftFrom(wallet) : EMPTY))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const save = useSaveWallet(userId)
  const name = slot === 'primary' ? 'principal' : 'secundária'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setErrors({})
    setFormError(null)
    const parsed = walletFormSchema.safeParse(draft)
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error))
      focusFirstInvalid(formRef)
      return
    }
    save.mutate(wallet ? { walletId: wallet.id, input: parsed.data } : { input: { ...parsed.data, slot } }, {
      onSuccess: () => {
        const message = wallet ? `Carteira ${name} atualizada` : `Carteira ${name} cadastrada`
        announce(message)
        toast.success(message)
      },
      onError: (error) => {
        if (isSessionError(error)) return
        if (error instanceof ApiError && Object.keys(error.fields).length) {
          setErrors(error.fields)
          focusFirstInvalid(formRef)
        }
        setFormError(error instanceof ApiError && error.status && error.status < 500 ? error.message : 'Não foi possível salvar a carteira. Tente de novo.')
      },
    })
  }

  const field = (key: keyof Draft) => ({
    name: key,
    value: draft[key],
    onChange: (event: { target: { value: string } }) => setDraft((current) => ({ ...current, [key]: event.target.value })),
  })

  return (
    <form ref={formRef} noValidate onSubmit={submit} aria-label={`Carteira ${name}`} className="flex flex-col gap-6">
      {formError && (
        <p role="alert" className="rounded-[5px] border border-danger/60 bg-danger/10 px-3 py-2 text-caption text-fg">
          {formError}
        </p>
      )}
      <div className="grid gap-x-7 gap-y-5 lg:grid-cols-2">
        <FormField label="Apelido da carteira" required error={errors.label}>
          {(a11y) => (
            <input {...a11y} {...field('label')} placeholder={slot === 'primary' ? 'Principal' : 'Reserva'} autoComplete="off" autoFocus={autoFocus} className={inputClass} />
          )}
        </FormField>
        <FormField label="Rede" required error={errors.network}>
          {(a11y) => (
            <select {...a11y} {...field('network')} className={selectClass}>
              <option value="" disabled>
                Selecione uma rede
              </option>
              {networkSchema.options.map((option) => (
                <option key={option} value={option}>
                  {NETWORK_LABELS[option]}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField label="Endereço da carteira" required error={errors.address} hint="0x seguido de 40 caracteres hexadecimais, ou um nome .eth.">
          {(a11y) => <input {...a11y} {...field('address')} placeholder="Endereço 0x da carteira" autoComplete="off" spellCheck={false} className={inputClass} />}
        </FormField>
        <FormField label="Tipo de carteira" required error={errors.provider}>
          {(a11y) => (
            <select {...a11y} {...field('provider')} className={selectClass}>
              <option value="" disabled>
                Selecione uma carteira
              </option>
              {walletProviderSchema.options.map((option) => (
                <option key={option} value={option}>
                  {WALLET_PROVIDER_LABELS[option]}
                </option>
              ))}
            </select>
          )}
        </FormField>
      </div>
      <Button type="submit" disabled={save.isPending} className="h-12 w-full px-5 text-body font-bold lg:h-10 lg:w-fit">
        {save.isPending ? 'Salvando…' : wallet ? 'Salvar carteira' : 'Adicionar carteira'}
        <span className="sr-only"> {name}</span>
      </Button>
    </form>
  )
}
