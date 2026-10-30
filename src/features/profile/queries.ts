import { queryOptions } from '@tanstack/react-query'
import { fetchProfile } from '@/features/profile/api'

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ['me', userId, 'profile'],
    queryFn: ({ signal }) => fetchProfile(signal),
    staleTime: 60_000,
  })
