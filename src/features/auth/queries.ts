import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { redirect, useNavigate, type ParsedLocation } from '@tanstack/react-router'
import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { fetchSession, login, logout, register } from '@/features/auth/api'
import { isSessionError } from '@/features/auth/session-events'
import { mergeCart } from '@/features/cart/api'
import { cartKeys } from '@/features/cart/keys'
import { clearCartNotices } from '@/features/cart/notices'
import { getGuestCartId, getToken, rotateGuestCartId, setToken, subscribeToken } from '@/shared/api/credentials'
import type { LoginInput, RegisterInput, Session } from '@/shared/contracts'
import { announce } from '@/shared/ui/announcer'

export const sessionQuery = (token: string | null) =>
  queryOptions({
    queryKey: ['session', token],
    queryFn: ({ signal }) => fetchSession(signal),
    enabled: token !== null,
    staleTime: 60_000,
    retry: false,
  })

/** Token salvo, reativo: muda no login, no logout, na expiração e em outra aba. */
export function useToken() {
  return useSyncExternalStore(subscribeToken, getToken, () => null)
}

/** Usuário logado, ou `null` para visitante. `isPending` enquanto a sessão salva ainda está sendo conferida. */
export function useCurrentUser() {
  const token = useToken()
  const { data, isPending, isError } = useQuery(sessionQuery(token))
  if (!token || isError) return { user: null, isPending: false }
  return { user: data?.user ?? null, isPending }
}

/**
 * Abre a sessão: limpa o que for de outro usuário, junta o carrinho de visitante e só então
 * publica o token. O merge vai com o token explícito para nenhuma query do novo usuário
 * buscar o carrinho antes dele.
 */
async function startSession(queryClient: QueryClient, session: Session) {
  await queryClient.cancelQueries({ queryKey: ['me'] })
  queryClient.removeQueries({ queryKey: ['me'] })
  queryClient.removeQueries({ queryKey: ['session'] })
  queryClient.setQueryData(sessionQuery(session.token).queryKey, { user: session.user, expiresAt: session.expiresAt })

  try {
    const { cart, adjustments } = await mergeCart(getGuestCartId(), session.token)
    rotateGuestCartId()
    queryClient.removeQueries({ queryKey: cartKeys.guests() })
    queryClient.setQueryData(cartKeys.user(session.user.id), cart)
    if (adjustments.length) {
      const message = 'Algumas quantidades do carrinho foram ajustadas ao estoque disponível.'
      toast.warning(message)
      announce(message)
    }
  } catch {
    // Os itens do visitante continuam no servidor, com o mesmo id; nada se perde.
    toast.error('Não conseguimos juntar o carrinho de visitante ao da sua conta.')
  }

  setToken(session.token)
}

/** Fecha a sessão no cliente: dados privados, requisições em andamento e avisos. O socket reabre sozinho sem token. */
export function endSession(queryClient: QueryClient) {
  setToken(null)
  void queryClient.cancelQueries({ queryKey: ['me'] })
  queryClient.removeQueries({ queryKey: ['me'] })
  queryClient.removeQueries({ queryKey: ['session'] })
  clearCartNotices()
}

/** Só caminhos internos: evita redirecionar para outro site depois do login. */
export function safeRedirect(value: string | undefined) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (session) => startSession(queryClient, session),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterInput) => register(input),
    onSuccess: (session) => startSession(queryClient, session),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    // Sair nunca falha para o usuário: mesmo sem resposta, a sessão local é encerrada.
    mutationFn: () => logout().catch(() => undefined),
    onSettled: () => {
      endSession(queryClient)
      announce('Você saiu da conta')
      toast.success('Você saiu da conta')
      void navigate({ to: '/' })
    },
  })
}

/** `beforeLoad` das rotas protegidas: sem sessão válida, vai para o login e volta depois. */
export async function requireAuth({ context, location }: { context: { queryClient: QueryClient }; location: ParsedLocation }) {
  const token = getToken()
  let expired = false
  if (token) {
    try {
      await context.queryClient.ensureQueryData(sessionQuery(token))
      return
    } catch (error) {
      expired = isSessionError(error)
    }
  }
  throw redirect({ to: '/login', search: { redirect: location.href, reason: expired ? 'expired' : undefined } })
}
