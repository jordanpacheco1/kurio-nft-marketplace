import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import { db } from '@/mocks/db/store'

type SocketIoConnection = ReturnType<typeof toSocketIo>
type Client = { io: SocketIoConnection; close: () => void; userId: string | null }

export const realtime = ws.link(import.meta.env.VITE_SOCKET_URL) // só a origem (armadilha 3)

const clients = new Set<Client>()
let refuseUntil = 0

/** Dono do token da query, se a sessão for válida. Sem token (ou com token vencido), o socket só recebe eventos públicos. */
function userFromToken(token: string | null) {
  const session = token ? db.sessions.find((item) => item.token === token) : undefined
  return session && Date.parse(session.expiresAt) > Date.now() ? session.userId : null
}

export const realtimeHandler = realtime.addEventListener('connection', (connection) => {
  // Queda simulada: recusa conexões novas; o cliente recebe `transport close` e tenta de novo.
  // Fechar antes do handshake do Engine.IO não chega ao cliente (a tentativa fica pendurada até o
  // timeout de 20 s do Manager). Então o binding abre a conexão e ela é fechada logo em seguida.
  if (Date.now() < refuseUntil) {
    toSocketIo(connection)
    setTimeout(() => connection.client.close(), 0)
    return
  }

  const client: Client = {
    io: toSocketIo(connection),
    close: () => connection.client.close(),
    userId: userFromToken(connection.client.url.searchParams.get('token')),
  }
  clients.add(client)

  // O binding nunca manda ping do Engine.IO; sem isso o cliente cai a cada ~30 s (armadilha 6).
  const keepAlive = setInterval(() => connection.client.send('2'), 20_000)
  connection.client.addEventListener('close', () => {
    clearInterval(keepAlive)
    clients.delete(client)
  })
})

/** Evento público (catálogo): vai para todos os sockets. */
export function broadcast(event: string, payload: unknown) {
  for (const client of clients) client.io.client.emit(event, payload)
}

/** Evento privado: só para os sockets autenticados como `userId`. */
export function emitToUser(userId: string, event: string, payload: unknown) {
  for (const client of clients) if (client.userId === userId) client.io.client.emit(event, payload)
}

/** Fecha todas as conexões e recusa novas por `ms`. */
export function dropSocket(ms = 5000) {
  refuseUntil = Date.now() + ms
  for (const client of [...clients]) client.close()
}

export function connectedClients() {
  return clients.size
}
