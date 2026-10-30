import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { bindRealtimeToCache } from '@/shared/realtime/sync'
import { openSocket } from '@/shared/realtime/socket'

export function RealtimeBridge() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let cleanup: (() => void) | undefined
    let cancelled = false
    void openSocket(null).then((socket) => {
      if (cancelled) socket.disconnect()
      else cleanup = bindRealtimeToCache(socket, queryClient)
    })
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [queryClient])

  return null
}
