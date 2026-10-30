import { HttpResponse } from 'msw'
import { loginInputSchema, registerInputSchema, type CurrentSession, type Session } from '@/shared/contracts'
import { hashPassword, newSalt, verifyPassword } from '@/mocks/db/password'
import { db } from '@/mocks/db/store'
import type { UserRecord } from '@/mocks/db/types'
import { toUser } from '@/mocks/db/views'
import { bearerToken, fail, noContent, readBody, requireUser, route } from '@/mocks/handlers/http'
import { isScenarioActive } from '@/mocks/scenarios/registry'

const SESSION_TTL_MS = 2 * 3_600_000
const SHORT_SESSION_TTL_MS = 30_000 // cenário session-expired

function openSession(user: UserRecord): Session {
  const ttl = isScenarioActive('session-expired') ? SHORT_SESSION_TTL_MS : SESSION_TTL_MS
  const session = { token: crypto.randomUUID(), userId: user.id, expiresAt: new Date(Date.now() + ttl).toISOString() }
  db.sessions.push(session)
  return { token: session.token, user: toUser(user), expiresAt: session.expiresAt }
}

const sameText = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** Regra fixa do mock: e-mail ou nome de usuário já cadastrado sempre dá 409, apontando o campo. */
export function assertUnique(fields: { email?: string; username?: string }, exceptUserId?: string) {
  const others = db.users.filter((user) => user.id !== exceptUserId)
  const conflicts: Record<string, string> = {}
  if (fields.email && others.some((user) => sameText(user.email, fields.email!))) {
    conflicts.email = 'Este e-mail já está cadastrado'
  }
  if (fields.username && others.some((user) => sameText(user.username, fields.username!))) {
    conflicts.username = 'Este nome de usuário já está em uso'
  }
  if (Object.keys(conflicts).length) fail('CONFLICT', 'Já existe uma conta com esses dados.', { fields: conflicts })
}

export const authHandlers = [
  route('post', '/auth/register', async ({ request }) => {
    const input = await readBody(request, registerInputSchema)
    assertUnique(input)
    const salt = newSalt()
    const user: UserRecord = {
      id: `u-${crypto.randomUUID().slice(0, 8)}`,
      username: input.username,
      email: input.email.toLowerCase(),
      displayName: input.username,
      ensName: null,
      walletNickname: null,
      avatarUrl: null,
      passwordSalt: salt,
      passwordHash: await hashPassword(input.password, salt),
    }
    db.users.push(user)
    return HttpResponse.json(openSession(user), { status: 201 })
  }),

  route('post', '/auth/login', async ({ request }) => {
    const input = await readBody(request, loginInputSchema)
    const user = db.users.find((item) => sameText(item.email, input.email))
    const valid = user && (await verifyPassword(input.password, user.passwordSalt, user.passwordHash))
    if (!user || !valid) fail('UNAUTHENTICATED', 'E-mail ou senha incorretos.')
    return HttpResponse.json(openSession(user))
  }),

  route('get', '/auth/session', ({ request }) => {
    const { user, session } = requireUser(request)
    return HttpResponse.json<CurrentSession>({ user: toUser(user), expiresAt: session.expiresAt })
  }),

  // Sempre 204: sair com uma sessão já vencida também é sucesso.
  route('post', '/auth/logout', ({ request }) => {
    const token = bearerToken(request)
    db.sessions = db.sessions.filter((item) => item.token !== token)
    db.walletSessions = db.walletSessions.filter((item) => db.sessions.some((s) => s.userId === item.userId))
    return noContent()
  }),
]
