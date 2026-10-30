import type { CollectorDraft } from '@/features/checkout/storage'
import { collectorSchema, type Profile, type Wallet } from '@/shared/contracts'
import { zodFieldErrors } from '@/shared/forms'

/** Dados do colecionador pré-preenchidos com o perfil (no mobile, é a única fonte). */
export function draftFromProfile(profile: Profile, wallets: Wallet[]): CollectorDraft {
  return {
    displayName: profile.displayName,
    username: profile.username,
    profileName: profile.walletNickname ?? profile.displayName,
    email: profile.email,
    ensLabel: profile.ensName?.replace(/\.eth$/, '') ?? '',
    secondaryWallet: wallets.find((wallet) => wallet.slot === 'secondary')?.address ?? '',
    referralCode: '',
    note: '',
  }
}

const optional = (value: string) => value.trim() || undefined

/** Valida o rascunho com o mesmo schema da API. Os erros usam os nomes do contrato (`ensName`, ...). */
export function parseCollector(draft: CollectorDraft) {
  const ens = draft.ensLabel.trim().toLowerCase()
  const parsed = collectorSchema.safeParse({
    displayName: draft.displayName,
    username: draft.username,
    profileName: draft.profileName,
    email: draft.email,
    ensName: ens ? (ens.endsWith('.eth') ? ens : `${ens}.eth`) : '',
    secondaryWallet: optional(draft.secondaryWallet),
    referralCode: optional(draft.referralCode),
    note: optional(draft.note),
  })
  return parsed.success
    ? ({ ok: true, collector: parsed.data } as const)
    : ({ ok: false, errors: zodFieldErrors(parsed.error) } as const)
}
