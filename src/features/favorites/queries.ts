import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useCurrentUser } from '@/features/auth/queries'
import { fetchFavorites, setFavorite } from '@/features/favorites/api'
import { nftSummarySchema, type Favorites, type NftSummary } from '@/shared/contracts'
import { announce } from '@/shared/ui/announcer'

export const favoritesKey = (userId: string) => ['me', userId, 'favorites'] as const

export const favoritesQuery = (userId: string) =>
  queryOptions({
    queryKey: favoritesKey(userId),
    queryFn: ({ signal }) => fetchFavorites(signal),
    staleTime: 30_000,
  })

type Toggle = { nft: NftSummary; favorited: boolean }

/**
 * Estado e ação do coração. Visitante vai para o login (e volta para onde estava).
 * A mutation é otimista: o coração muda na hora e volta atrás se a API falhar.
 */
export function useFavorites() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const { data } = useQuery({ ...favoritesQuery(user?.id ?? ''), enabled: !!user })

  const mutation = useMutation({
    mutationFn: ({ nft, favorited }: Toggle) => setFavorite(nft.id, favorited),
    onMutate: async ({ nft, favorited }: Toggle) => {
      const key = favoritesKey(user!.id)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Favorites>(key)
      // Guarda só os campos do resumo, mesmo quando vem do detalhe.
      const summary = nftSummarySchema.parse(nft)
      queryClient.setQueryData<Favorites>(key, (current) => {
        const items = (current?.items ?? []).filter((item) => item.id !== nft.id)
        return { items: favorited ? [summary, ...items] : items }
      })
      announce(favorited ? `${nft.name} adicionado aos favoritos` : `${nft.name} removido dos favoritos`)
      return { previous }
    },
    onError: (_error, { nft }, context) => {
      queryClient.setQueryData(favoritesKey(user!.id), context?.previous)
      const message = `Não foi possível atualizar os favoritos de ${nft.name}. Tente de novo.`
      toast.error(message)
      announce(message)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: favoritesKey(user!.id) }),
  })

  const ids = new Set(data?.items.map((item) => item.id))

  return {
    isFavorite: (nftId: string) => ids.has(nftId),
    toggle: (nft: NftSummary) => {
      if (!user) {
        void navigate({ to: '/login', search: { redirect: location.href } })
        return
      }
      mutation.mutate({ nft, favorited: !ids.has(nft.id) })
    },
  }
}
