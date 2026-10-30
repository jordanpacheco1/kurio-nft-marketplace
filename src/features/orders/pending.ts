import { useSyncExternalStore } from 'react'

// Pedido pendente no localStorage: depois de um refresh (ou de outra aba), o app busca o
// pedido de novo e retoma de onde parou, sem criar outra compra.
const KEY = 'kurio.pendingOrder'

export type PendingOrder = { orderId: string; userId: string }

const listeners = new Set<() => void>()
let cachedRaw: string | null = null
let cached: PendingOrder | null = null

function read(): PendingOrder | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return null
  }
  if (raw === cachedRaw) return cached
  cachedRaw = raw
  try {
    cached = raw ? (JSON.parse(raw) as PendingOrder) : null
  } catch {
    cached = null
  }
  return cached
}

function write(value: PendingOrder | null) {
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value))
    else localStorage.removeItem(KEY)
  } catch {
    // Sem storage: a retomada vale só nesta aba.
  }
  listeners.forEach((notify) => notify())
}

export const savePendingOrder = (order: PendingOrder) => write(order)

/** Só limpa se ainda for o mesmo pedido (outro pode ter sido criado depois). */
export function clearPendingOrder(orderId: string) {
  if (read()?.orderId === orderId) write(null)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** Pedido pendente do usuário atual (o de outro usuário é ignorado). */
export function usePendingOrder(userId: string | null) {
  const pending = useSyncExternalStore(subscribe, read, () => null)
  return pending && pending.userId === userId ? pending : null
}
