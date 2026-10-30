import { cn } from '@/lib/utils'
import type { RefObject } from 'react'
import type { CollectorDraft } from '@/features/checkout/storage'
import { NETWORK_LABELS, WALLET_PROVIDER_LABELS, networkSchema, type Network, type Wallet } from '@/shared/contracts'
import { FormField as Field, inputClass } from '@/shared/ui/form-field'

const selectClass = `${inputClass} text-copper-text`

type Props = {
  formRef: RefObject<HTMLFormElement | null>
  draft: CollectorDraft
  onChange: (field: keyof CollectorDraft, value: string) => void
  errors: Record<string, string>
  network: Network
  onNetworkChange: (network: Network) => void
  wallet: Wallet | null
  /** Há outra carteira cadastrada para "Usar outra carteira?". */
  otherWallet: Wallet | null
  onUseOtherWallet: () => void
  onSubmit: () => void
}

/** "Perfil do colecionador" do pagamento desktop. Endereço e tipo vêm da carteira escolhida. */
export function CollectorForm({ formRef, draft, onChange, errors, network, onNetworkChange, wallet, otherWallet, onUseOtherWallet, onSubmit }: Props) {
  const text = (field: keyof CollectorDraft) => ({
    name: field,
    value: draft[field],
    onChange: (event: { target: { value: string } }) => onChange(field, event.target.value),
    className: inputClass,
  })

  return (
    <form
      ref={formRef}
      id="collector-form"
      noValidate
      aria-labelledby="collector-title"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="flex flex-col gap-4"
    >
      <h2 id="collector-title" className="text-tab font-bold text-fg">
        Perfil do colecionador
      </h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Field label="Nome de exibição" required error={errors.displayName}>
          {(a11y) => <input {...a11y} {...text('displayName')} autoComplete="name" />}
        </Field>
        <Field label="Nome de usuário" required error={errors.username}>
          {(a11y) => <input {...a11y} {...text('username')} autoComplete="username" />}
        </Field>
        <Field label="Rede" required>
          {(a11y) => (
            <select
              {...a11y}
              value={network}
              onChange={(event) => onNetworkChange(networkSchema.parse(event.target.value))}
              className={selectClass}
            >
              {networkSchema.options.map((option) => (
                <option key={option} value={option}>
                  {NETWORK_LABELS[option]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Nome do perfil" required error={errors.profileName}>
          {(a11y) => <input {...a11y} {...text('profileName')} />}
        </Field>
        <Field label="Endereço da carteira" required hint="Vem da carteira escolhida em “Carteira e rede”.">
          {(a11y) => <input {...a11y} value={wallet?.address ?? ''} placeholder="Endereço 0x da carteira" readOnly className={`${inputClass} text-fg-secondary`} />}
        </Field>
        <Field label="ENS ou carteira secundária (opcional)" hideLabel error={errors.secondaryWallet} className="self-end">
          {(a11y) => <input {...a11y} {...text('secondaryWallet')} placeholder="ENS ou carteira secundária (opcional)" />}
        </Field>
        <Field label="Tipo de carteira" required>
          {(a11y) => (
            <input {...a11y} value={wallet ? WALLET_PROVIDER_LABELS[wallet.provider] : ''} placeholder="Selecione uma carteira" readOnly className={`${inputClass} text-copper-text`} />
          )}
        </Field>
        <Field label="Código de indicação (opcional)" error={errors.referralCode}>
          {(a11y) => <input {...a11y} {...text('referralCode')} autoComplete="off" />}
        </Field>
        <Field label="E-mail" required error={errors.email}>
          {(a11y) => <input {...a11y} {...text('email')} type="email" autoComplete="email" />}
        </Field>
        <Field label="Nome ENS" required error={errors.ensName}>
          {(a11y) => (
            <div className="flex items-stretch gap-2">
              <input {...a11y} {...text('ensLabel')} placeholder="seunome" autoComplete="off" className={`${inputClass} min-w-0 flex-1`} />
              <span aria-hidden="true" className="grid place-items-center rounded-[5px] border border-input px-3 text-body text-fg">
                .eth
              </span>
            </div>
          )}
        </Field>
      </div>
      <label className={cn('flex w-fit items-center gap-2 text-body text-fg', !otherWallet && 'opacity-60')}>
        <input
          type="checkbox"
          checked={!!wallet && wallet.slot === 'secondary'}
          disabled={!otherWallet}
          onChange={onUseOtherWallet}
          className="size-4 accent-copper"
        />
        Usar outra carteira?
      </label>
      <Field label="Observação do colecionador (opcional)" error={errors.note} className="max-w-[350px]">
        {(a11y) => (
          <textarea
            {...a11y}
            name="note"
            value={draft.note}
            onChange={(event) => onChange('note', event.target.value)}
            rows={6}
            className={cn(inputClass, 'h-auto resize-y py-2 lg:h-[150px]')}
          />
        )}
      </Field>
    </form>
  )
}
