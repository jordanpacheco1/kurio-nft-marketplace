import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { isSessionError, reportSessionLost } from '@/features/auth/session-events'
import { ApiError } from '@/shared/api/errors'

// Retry só para erro de rede ou 5xx; 4xx nunca é repetido.
function shouldRetry(failureCount: number, error: unknown) {
  if (failureCount >= 2) return false
  return error instanceof ApiError && error.isTransient
}

// Sessão vencida em qualquer query ou mutation: um ponto só trata (limpa o cache e leva ao login).
const onError = (error: unknown) => {
  if (isSessionError(error)) reportSessionLost()
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    queries: { retry: shouldRetry, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
})
