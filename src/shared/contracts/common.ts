import { z } from 'zod'

// Sem alias `@/` nesta pasta: os testes do Playwright importam os schemas direto.

/** Valor em ETH como string decimal (até 18 casas). Nunca trafega como number. */
export const ethSchema = z.string().regex(/^\d+(\.\d{1,18})?$/, 'Valor em ETH inválido')

export const isoDateSchema = z.iso.datetime({ offset: true })

export const networkSchema = z.enum(['ethereum', 'polygon', 'solana'])
export type Network = z.infer<typeof networkSchema>

export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const collectionSchema = z.enum([
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
])
export type Collection = z.infer<typeof collectionSchema>

export const COLLECTION_LABELS: Record<Collection, string> = {
  'arte-digital': 'Arte digital',
  fotografia: 'Fotografia',
  musica: 'Música',
  'arte-3d': 'Arte 3D',
  colecionaveis: 'Colecionáveis',
  generativa: 'Generativa',
  jogos: 'Jogos',
  assinaturas: 'Assinaturas',
  utilidade: 'Utilidade',
}

/** Limite de unidades por item do carrinho, além do estoque da edição. */
export const MAX_QUANTITY_PER_ITEM = 10

/** Endereço `0x` + 40 hex ou nome ENS (`*.eth`). */
export const evmAddressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Use 0x seguido de 40 caracteres hexadecimais')
export const ensNameSchema = z
  .string()
  .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/, 'Use um nome ENS terminado em .eth (ex.: nome.eth)')
export const walletAddressSchema = z.union([evmAddressSchema, ensNameSchema], {
  error: 'Informe um endereço 0x… válido ou um nome .eth',
})

export const emailSchema = z.email('E-mail inválido').max(120)
export const usernameSchema = z
  .string()
  .min(3, 'Mínimo de 3 caracteres')
  .max(24, 'Máximo de 24 caracteres')
  .regex(/^[a-z0-9_.]+$/, 'Use só letras minúsculas, números, ponto e _')
export const passwordSchema = z
  .string()
  .min(8, 'Mínimo de 8 caracteres')
  .max(72, 'Máximo de 72 caracteres')
  .regex(/[A-Za-z]/, 'Inclua pelo menos uma letra')
  .regex(/\d/, 'Inclua pelo menos um número')

export function paginated<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(1),
  })
}
