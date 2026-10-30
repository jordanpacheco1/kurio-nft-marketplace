import { ApiError } from '@/shared/api/errors'
import { getToken } from '@/shared/api/credentials'

/**
 * Sessão perdida no meio do uso: 401 `SESSION_EXPIRED`, ou `UNAUTHENTICATED` com um token salvo
 * (a sessão sumiu do servidor). Sem token, o 401 é só "precisa entrar" (ex.: senha errada no login).
 */
export function isSessionError(error: unknown) {
  if (!(error instanceof ApiError)) return false
  return error.code === 'SESSION_EXPIRED' || (error.code === 'UNAUTHENTICATED' && getToken() !== null)
}

const listeners = new Set<() => void>()

/** Chamado pelos caches do TanStack Query em qualquer erro de sessão. O `SessionWatcher` reage. */
export function reportSessionLost() {
  listeners.forEach((notify) => notify())
}

export function onSessionLost(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
