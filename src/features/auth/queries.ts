import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchSession } from '@/features/auth/api'
import { getToken } from '@/shared/api/credentials'

// Base da sessão para a Fase 3 (favoritos e carrinho precisam do id do usuário).
// Login, cadastro, expiração e troca de usuário entram na Fase 4.
export const sessionQuery = (token: string | null) =>
  queryOptions({
    queryKey: ['session', token],
    queryFn: ({ signal }) => fetchSession(signal),
    enabled: token !== null,
    staleTime: 60_000,
    retry: false,
  })

/** Usuário logado, ou `null` para visitante. `isPending` enquanto a sessão salva ainda está sendo conferida. */
export function useCurrentUser() {
  const token = getToken()
  const { data, isPending, isError } = useQuery(sessionQuery(token))
  if (!token || isError) return { user: null, isPending: false }
  return { user: data?.user ?? null, isPending }
}
