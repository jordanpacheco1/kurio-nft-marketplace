import { api } from '@/shared/api/client'
import { favoritesSchema, favoriteToggleSchema } from '@/shared/contracts'

export async function fetchFavorites(signal?: AbortSignal) {
  const { data } = await api.get('/me/favorites', { signal })
  return favoritesSchema.parse(data)
}

export async function setFavorite(nftId: string, favorited: boolean) {
  const path = `/me/favorites/${encodeURIComponent(nftId)}`
  const { data } = favorited ? await api.put(path) : await api.delete(path)
  return favoriteToggleSchema.parse(data)
}
