import type { Network } from '@/shared/contracts'

// sessionStorage, sempre com o id do usuário na chave: nada passa de uma conta para outra.

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sem storage: o rascunho e a chave valem só enquanto a tela estiver aberta.
  }
}

// ----- Tentativa de compra (Idempotency-Key) -----

type Attempt = { key: string; bodyHash: string }

/**
 * Chave da tentativa: o mesmo corpo (reenvio, timeout, duplo clique) reaproveita a chave.
 * Corpo novo só existe com uma cotação nova reconfirmada, e aí a chave também é nova.
 */
export function attemptKey(userId: string, body: unknown) {
  const storageKey = `kurio.checkoutAttempt.${userId}`
  const bodyHash = JSON.stringify(body)
  const stored = read<Attempt>(storageKey)
  if (stored?.bodyHash === bodyHash) return stored.key
  const key = crypto.randomUUID()
  write(storageKey, { key, bodyHash } satisfies Attempt)
  return key
}

// ----- Rascunho do checkout (sobrevive à sessão expirada e ao refresh) -----

export type CollectorDraft = {
  displayName: string
  username: string
  profileName: string
  email: string
  /** Só o nome, sem o `.eth` (o campo mostra o sufixo fixo). */
  ensLabel: string
  secondaryWallet: string
  referralCode: string
  note: string
}

export type CheckoutDraft = { collector: CollectorDraft; walletId: string | null; network: Network | null }

const draftKey = (userId: string) => `kurio.checkoutDraft.${userId}`

export const loadDraft = (userId: string) => read<CheckoutDraft>(draftKey(userId))
export const saveDraft = (userId: string, draft: CheckoutDraft) => write(draftKey(userId), draft)
export const clearDraft = (userId: string) => write(draftKey(userId), null)
