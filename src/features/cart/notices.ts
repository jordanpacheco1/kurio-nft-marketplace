import { useSyncExternalStore } from 'react'

// Avisos de preço e estoque que chegam pelo socket enquanto há itens no carrinho.
// Ficam até o usuário dispensar (ou até o logout), para não sumirem antes de serem lidos.
export type CartNotice = { id: string; text: string }

let notices: CartNotice[] = []
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((notify) => notify())
}

export function pushCartNotice(notice: CartNotice) {
  notices = [...notices.filter((item) => item.id !== notice.id), notice]
  emit()
}

export function dismissCartNotice(id: string) {
  notices = notices.filter((item) => item.id !== id)
  emit()
}

export function clearCartNotices() {
  if (!notices.length) return
  notices = []
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useCartNotices() {
  return useSyncExternalStore(subscribe, () => notices, () => notices)
}
