import { api } from '@/shared/api/client'
import { currentSessionSchema } from '@/shared/contracts'

export async function fetchSession(signal?: AbortSignal) {
  const { data } = await api.get('/auth/session', { signal })
  return currentSessionSchema.parse(data)
}
