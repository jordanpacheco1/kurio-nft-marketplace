import { isAxiosError, isCancel } from 'axios'
import { apiErrorBodySchema, type ApiErrorBody, type ErrorCode } from '@/shared/contracts'

/** Erros que não vêm do envelope da API: sem resposta, timeout do cliente ou cancelamento. */
export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'CANCELED'

/** Todo erro que sai do cliente Axios é um `ApiError`, com o envelope já validado. */
export class ApiError extends Error {
  readonly code: ErrorCode | ClientErrorCode
  readonly status: number | null
  readonly fields: Record<string, string>
  readonly quote: ApiErrorBody['error']['quote']
  readonly retryAfterMs: number | null

  constructor(init: {
    code: ErrorCode | ClientErrorCode
    message: string
    status?: number | null
    fields?: Record<string, string>
    quote?: ApiErrorBody['error']['quote']
    retryAfterMs?: number | null
    cause?: unknown
  }) {
    super(init.message, { cause: init.cause })
    this.name = 'ApiError'
    this.code = init.code
    this.status = init.status ?? null
    this.fields = init.fields ?? {}
    this.quote = init.quote
    this.retryAfterMs = init.retryAfterMs ?? null
  }

  /** Falha transitória: sem resposta ou 5xx. É o que as queries repetem. */
  get isTransient() {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT' || (this.status !== null && this.status >= 500)
  }
}

export function toApiError(error: unknown, timedOut = false): ApiError {
  if (error instanceof ApiError) return error
  if (timedOut) return new ApiError({ code: 'TIMEOUT', message: 'O servidor demorou para responder.', cause: error })
  if (isCancel(error)) return new ApiError({ code: 'CANCELED', message: 'Requisição cancelada.', cause: error })
  if (!isAxiosError(error)) return new ApiError({ code: 'NETWORK_ERROR', message: 'Erro inesperado.', cause: error })

  const response = error.response
  if (!response) return new ApiError({ code: 'NETWORK_ERROR', message: 'Sem conexão com o servidor.', cause: error })

  const parsed = apiErrorBodySchema.safeParse(response.data)
  const retryAfter = Number(response.headers['retry-after'])
  if (!parsed.success) {
    return new ApiError({
      code: response.status >= 500 ? 'UNAVAILABLE' : 'VALIDATION_ERROR',
      message: 'Resposta inesperada do servidor.',
      status: response.status,
      cause: error,
    })
  }
  const { code, message, fields, quote } = parsed.data.error
  return new ApiError({
    code,
    message,
    status: response.status,
    fields,
    quote,
    retryAfterMs: Number.isFinite(retryAfter) ? retryAfter * 1000 : null,
    cause: error,
  })
}
