import { api } from '@/shared/api/client'
import { profileSchema } from '@/shared/contracts'

export async function fetchProfile(signal?: AbortSignal) {
  const { data } = await api.get('/me/profile', { signal })
  return profileSchema.parse(data)
}
