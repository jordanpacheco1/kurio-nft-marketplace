import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { endSession } from '@/features/auth/queries'
import { onSessionLost } from '@/features/auth/session-events'
import { getToken } from '@/shared/api/credentials'
import { announce } from '@/shared/ui/announcer'

/**
 * Sessão vencida durante a navegação: limpa os dados privados e leva ao login, guardando a tela
 * atual em `redirect` para voltar depois. Várias requisições com 401 juntas tratam uma vez só.
 */
export function SessionWatcher() {
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(
    () =>
      onSessionLost(() => {
        if (!getToken()) return
        endSession(queryClient)
        announce('Sua sessão expirou. Entre de novo para continuar.')
        const { pathname, href } = router.state.location
        if (pathname === '/login' || pathname === '/cadastro') return
        void router.navigate({ to: '/login', search: { redirect: href, reason: 'expired' } })
      }),
    [queryClient, router],
  )

  return null
}
