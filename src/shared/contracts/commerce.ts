import { z } from 'zod'
import { ensNameSchema, emailSchema, ethSchema, isoDateSchema, networkSchema, usernameSchema } from './common'
import { walletProviderSchema } from './account'
import { editionLabelSchema, nftImageSchema } from './nft'

// ----- Carrinho -----

export const couponSchema = z.object({
  code: z.string(),
  /** Percentual inteiro (10 = 10%). */
  percent: z.number().int().min(1).max(100),
})
export type Coupon = z.infer<typeof couponSchema>

export const cartItemSchema = z.object({
  /** `${nftId}:${editionId}`: uma linha por edição. */
  id: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  tokenId: z.string(),
  image: nftImageSchema,
  editionLabel: editionLabelSchema,
  quantity: z.number().int().positive(),
  /** Preço atual da edição; o carrinho sempre reflete o catálogo. */
  unitPriceEth: ethSchema,
  lineTotalEth: ethSchema,
  /** Estoque atual da edição. Se for menor que `quantity`, a linha precisa de ajuste antes do checkout. */
  available: z.number().int().min(0),
  version: z.number().int().positive(),
})
export type CartItem = z.infer<typeof cartItemSchema>

export const cartSchema = z.object({
  id: z.string(),
  items: z.array(cartItemSchema),
  coupon: couponSchema.nullable(),
  itemCount: z.number().int().min(0),
  subtotalEth: ethSchema,
  discountEth: ethSchema,
  /** Taxa estimada na rede padrão (Ethereum). A cotação traz a taxa da rede escolhida. */
  estimatedNetworkFeeEth: ethSchema,
  totalEth: ethSchema,
})
export type Cart = z.infer<typeof cartSchema>

export const addCartItemSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().positive(),
})
export type AddCartItem = z.infer<typeof addCartItemSchema>

export const updateCartItemSchema = z.object({ quantity: z.number().int().positive() })
export type UpdateCartItem = z.infer<typeof updateCartItemSchema>

export const applyCouponSchema = z.object({ code: z.string().trim().min(1, 'Informe o cupom').max(20) })
export type ApplyCoupon = z.infer<typeof applyCouponSchema>

export const mergeCartInputSchema = z.object({ guestCartId: z.string() })
export type MergeCartInput = z.infer<typeof mergeCartInputSchema>

export const mergeCartResultSchema = z.object({
  cart: cartSchema,
  /** Linhas cuja quantidade foi reduzida para caber no estoque. */
  adjustments: z.array(z.object({ itemId: z.string(), requested: z.number().int(), applied: z.number().int() })),
})
export type MergeCartResult = z.infer<typeof mergeCartResultSchema>

// ----- Cotação -----

export const quoteInputSchema = z.object({ network: networkSchema })
export type QuoteInput = z.infer<typeof quoteInputSchema>

export const quoteLineSchema = z.object({
  itemId: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  tokenId: z.string(),
  image: nftImageSchema,
  editionLabel: editionLabelSchema,
  quantity: z.number().int().positive(),
  unitPriceEth: ethSchema,
  lineTotalEth: ethSchema,
  /** Versão da edição na hora da cotação. Se mudar, o pedido dá `QUOTE_STALE`. */
  version: z.number().int().positive(),
})
export type QuoteLine = z.infer<typeof quoteLineSchema>

export const quoteSchema = z.object({
  quoteId: z.string(),
  network: networkSchema,
  lines: z.array(quoteLineSchema).min(1),
  subtotalEth: ethSchema,
  discountEth: ethSchema,
  networkFeeEth: ethSchema,
  totalEth: ethSchema,
  coupon: couponSchema.nullable(),
  expiresAt: isoDateSchema,
})
export type Quote = z.infer<typeof quoteSchema>

// ----- Pedidos -----

/** Dados do colecionador (formulário do pagamento no desktop; no mobile vêm do perfil). */
export const collectorSchema = z.object({
  displayName: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(40),
  username: usernameSchema,
  profileName: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(40),
  email: emailSchema,
  ensName: ensNameSchema,
  secondaryWallet: z.string().trim().max(64).optional(),
  referralCode: z.string().trim().max(20).optional(),
  note: z.string().trim().max(280, 'Máximo de 280 caracteres').optional(),
})
export type Collector = z.infer<typeof collectorSchema>

export const createOrderSchema = z.object({
  quoteId: z.string(),
  walletId: z.string(),
  network: networkSchema,
  collector: collectorSchema,
})
export type CreateOrder = z.infer<typeof createOrderSchema>

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'declined'])
export type OrderStatus = z.infer<typeof orderStatusSchema>

/** Snapshot gravado na confirmação. Mudanças posteriores no catálogo não o alteram. */
export const receiptSchema = z.object({
  transactionHash: z.string().regex(/^0x[0-9a-f]{64}$/),
  explorerUrl: z.url(),
  confirmedAt: isoDateSchema,
  network: networkSchema,
  wallet: z.object({ label: z.string(), address: z.string(), provider: walletProviderSchema }),
  lines: z.array(quoteLineSchema.omit({ version: true, itemId: true })),
  subtotalEth: ethSchema,
  discountEth: ethSchema,
  networkFeeEth: ethSchema,
  totalEth: ethSchema,
  coupon: couponSchema.nullable(),
})
export type Receipt = z.infer<typeof receiptSchema>

export const orderSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  version: z.number().int().positive(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  network: networkSchema,
  itemCount: z.number().int().positive(),
  totalEth: ethSchema,
  /** Só existe com `status: confirmed`. */
  receipt: receiptSchema.nullable(),
  /** Só existe com `status: declined`. */
  declineReason: z.string().nullable(),
})
export type Order = z.infer<typeof orderSchema>
