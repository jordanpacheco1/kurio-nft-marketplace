// Fila de uma mensagem para a região aria-live (anúncios de mutations e de eventos em tempo real).
let message = ''
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((notify) => notify())
}

export function announce(text: string) {
  // Limpa antes para o leitor de tela repetir mensagens iguais.
  message = ''
  emit()
  queueMicrotask(() => {
    message = text
    emit()
  })
}

export function subscribeAnnouncements(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getAnnouncement() {
  return message
}
