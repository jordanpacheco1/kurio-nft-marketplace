import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { sessionQuery, useToken } from '@/features/auth/queries'
import { bindRealtimeToCache } from '@/shared/realtime/sync'
import { openSocket } from '@/shared/realtime/socket'

// Um socket por sessão: login, logout ou troca de usuário fecham o anterior (e os listeners)
// e abrem outro com o token novo, para eventos privados nunca chegarem ao usuário errado.
export function RealtimeBridge() {
  const queryClient = useQueryClient()
  const token = useToken()

  useEffect(() => {
    let cleanup: (() => void) | undefined
    let cancelled = false
    void openSocket(token).then((socket) => {
      if (cancelled) socket.disconnect()
      else cleanup = bindRealtimeToCache(socket, queryClient, () => queryClient.getQueryData(sessionQuery(token).queryKey)?.user.id ?? null)
    })
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [queryClient, token])

  return null
}
