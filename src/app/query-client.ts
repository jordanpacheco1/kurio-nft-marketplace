import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api/errors'

// Retry só para erro de rede ou 5xx; 4xx nunca é repetido.
function shouldRetry(failureCount: number, error: unknown) {
  if (failureCount >= 2) return false
  return error instanceof ApiError && error.isTransient
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: shouldRetry, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
})
