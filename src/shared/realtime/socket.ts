import type { Socket } from 'socket.io-client'
import { mocksReady } from '@/app/boot'

export async function openSocket(token: string | null): Promise<Socket> {
  await mocksReady
  // Import dinâmico: o engine.io-client captura o WebSocket na avaliação do módulo (armadilha 5).
  const { io } = await import('socket.io-client')
  return io(import.meta.env.VITE_SOCKET_URL, {
    transports: ['websocket'], // polling não passa pelo MSW (armadilha 4)
    query: token ? { token } : {},
  })
}
