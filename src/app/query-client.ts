import { QueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

// Retry só para erro de rede ou 5xx; 4xx nunca é repetido.
function shouldRetry(failureCount: number, error: unknown) {
  if (failureCount >= 2) return false
  if (!isAxiosError(error)) return false
  const status = error.response?.status
  return status === undefined || status >= 500
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: shouldRetry, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
})
