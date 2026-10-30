import { z } from 'zod'
import { ethSchema, isoDateSchema } from './common'
import { orderStatusSchema, receiptSchema } from './commerce'

const envelope = <T extends string, R extends string, D extends z.ZodType>(type: T, resource: R, data: D) =>
  z.object({
    eventId: z.string(),
    type: z.literal(type),
    resource: z.object({ type: z.literal(resource), id: z.string() }),
    /** Versão do recurso depois da mudança. O cliente ignora versões menores ou iguais à que já tem. */
    version: z.number().int().positive(),
    occurredAt: isoDateSchema,
    /** Dono do recurso, nos eventos privados. */
    userId: z.string().optional(),
    data,
  })

export const nftUpdatedEventSchema = envelope(
  'nft.updated',
  'nft',
  z.object({
    /** Novo preço da edição padrão e novo estoque total, para o catálogo. */
    priceEth: ethSchema,
    available: z.number().int().min(0),
    editions: z.array(
      z.object({
        id: z.string(),
        priceEth: ethSchema,
        available: z.number().int().min(0),
        version: z.number().int().positive(),
      }),
    ),
  }),
)
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

export const orderUpdatedEventSchema = envelope(
  'order.updated',
  'order',
  z.object({
    status: orderStatusSchema,
    receipt: receiptSchema.nullable(),
    declineReason: z.string().nullable(),
  }),
).required({ userId: true })
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>
