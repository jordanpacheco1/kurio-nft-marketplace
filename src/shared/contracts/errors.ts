import { z } from 'zod'
import { quoteSchema } from './commerce'

export const errorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'OUT_OF_STOCK',
  'QUOTE_STALE',
  'IDEMPOTENCY_CONFLICT',
  'UNAVAILABLE',
])
export type ErrorCode = z.infer<typeof errorCodeSchema>

/** Status HTTP de cada código. Os mocks e o cliente usam a mesma tabela. */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  SESSION_EXPIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  OUT_OF_STOCK: 409,
  QUOTE_STALE: 409,
  IDEMPOTENCY_CONFLICT: 409,
  UNAVAILABLE: 503,
}

/** Envelope de erro de toda a API: `{ error: { code, message, fields?, quote? } }`. */
export const apiErrorBodySchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    /** Mensagem por campo do formulário (`VALIDATION_ERROR`, `CONFLICT`). */
    fields: z.record(z.string(), z.string()).optional(),
    /** `QUOTE_STALE` já devolve a cotação nova. */
    quote: quoteSchema.optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>
