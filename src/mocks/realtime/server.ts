import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'

type SocketIoConnection = ReturnType<typeof toSocketIo>

export const realtime = ws.link(import.meta.env.VITE_SOCKET_URL) // só a origem (armadilha 3)

const clients = new Set<SocketIoConnection>()

export const realtimeHandler = realtime.addEventListener('connection', (connection) => {
  const io = toSocketIo(connection)
  clients.add(io)

  // O binding nunca manda ping do Engine.IO; sem isso o cliente cai a cada ~30 s (armadilha 6).
  const keepAlive = setInterval(() => connection.client.send('2'), 20_000)
  connection.client.addEventListener('close', () => {
    clearInterval(keepAlive)
    clients.delete(io)
  })
})

export function broadcast(event: string, payload: unknown) {
  for (const io of clients) io.client.emit(event, payload)
}

export function connectedClients() {
  return clients.size
}
