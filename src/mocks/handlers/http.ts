import { http, HttpResponse, type DefaultBodyType, type PathParams } from 'msw'
import type { z } from 'zod'
import { ERROR_STATUS, type ApiErrorBody, type ErrorCode } from '@/shared/contracts'
import { db, persist } from '@/mocks/db/store'
import { applyNetwork } from '@/mocks/scenarios/network'

// Utilitários comuns a todos os handlers REST: envelope de erro, validação, sessão e rede simulada.

export function apiError(
  code: ErrorCode,
  message: string,
  extra: Omit<ApiErrorBody['error'], 'code' | 'message'> = {},
  headers: Record<string, string> = {},
) {
  const retryAfter: Record<string, string> = code === 'UNAVAILABLE' ? { 'Retry-After': '1' } : {}
  return HttpResponse.json<ApiErrorBody>(
    { error: { code, message, ...extra } },
    { status: ERROR_STATUS[code], headers: { ...retryAfter, ...headers } },
  )
}

/** Interrompe o handler devolvendo um erro da API (o MSW aceita `throw` de uma Response). */
export function fail(code: ErrorCode, message: string, extra?: Omit<ApiErrorBody['error'], 'code' | 'message'>): never {
  throw apiError(code, message, extra)
}

export function validationFields(error: z.ZodError) {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    fields[key] ??= issue.message
  }
  return fields
}

export function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value)
  if (!result.success) fail('VALIDATION_ERROR', 'Confira os campos destacados.', { fields: validationFields(result.error) })
  return result.data
}

export async function readBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    fail('VALIDATION_ERROR', 'O corpo da requisição precisa ser JSON.')
  }
  return parse(schema, body)
}

export function bearerToken(request: Request) {
  const header = request.headers.get('Authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : null
}

/** Usuário da sessão do header `Authorization`. Sem sessão: 401 `UNAUTHENTICATED`; vencida: 401 `SESSION_EXPIRED`. */
export function requireUser(request: Request) {
  const token = bearerToken(request)
  const session = token ? db.sessions.find((item) => item.token === token) : undefined
  if (!session) fail('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
  if (Date.parse(session.expiresAt) <= Date.now()) {
    db.sessions = db.sessions.filter((item) => item !== session)
    persist()
    fail('SESSION_EXPIRED', 'Sua sessão expirou. Entre de novo para continuar.')
  }
  const user = db.users.find((item) => item.id === session.userId)
  if (!user) fail('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
  return { user, session }
}

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'
type Resolver = (info: { request: Request; params: Record<string, string> }) => Response | Promise<Response>

/**
 * Registra um handler em `/api{path}` com as condições de rede do cenário.
 * Toda mutation grava o banco no localStorage, mesmo quando termina em erro.
 */
export function route(method: Method, path: string, resolver: Resolver) {
  return http[method]<PathParams, DefaultBodyType>(`/api${path}`, async ({ request, params }) => {
    const failure = await applyNetwork(request)
    if (failure) return failure
    try {
      return await resolver({ request, params: params as Record<string, string> })
    } catch (error) {
      if (error instanceof Response) return error
      console.error('[mocks]', error)
      return apiError('UNAVAILABLE', 'Erro inesperado no servidor simulado.')
    } finally {
      if (method !== 'get') persist()
    }
  })
}

export const noContent = () => new HttpResponse(null, { status: 204 })
