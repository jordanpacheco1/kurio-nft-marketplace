import type {
  Collector,
  Coupon,
  NftDetail,
  Order,
  QuoteLine,
  Wallet,
  WalletSession,
} from '@/shared/contracts'

// Formato interno do banco simulado. Os handlers convertem para os contratos em `views.ts`.

export type UserRecord = {
  id: string
  username: string
  email: string
  displayName: string
  ensName: string | null
  walletNickname: string | null
  avatarUrl: string | null
  passwordSalt: string
  passwordHash: string
}

export type SessionRecord = { token: string; userId: string; expiresAt: string }

/** Preço da edição padrão e estoque total são derivados das edições. */
export type NftRecord = Omit<NftDetail, 'priceEth' | 'available'> & { trendingScore: number }

export type CartLineRecord = { nftId: string; editionId: string; quantity: number }

export type CartRecord = {
  id: string
  /** `null` no carrinho de visitante. */
  ownerId: string | null
  lines: CartLineRecord[]
  couponCode: string | null
}

export type QuoteRecord = {
  quoteId: string
  userId: string
  network: Order['network']
  lines: QuoteLine[]
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  coupon: Coupon | null
  expiresAt: string
  consumedBy: string | null
}

export type OrderRecord = Order & {
  userId: string
  quoteId: string
  walletId: string
  collector: Collector
  /** Quando o pagamento simulado termina (confirma ou recusa). */
  settleAt: string
  /** Decidido na criação (cenário payment-declined), para a troca de cenário não mudar um pedido em andamento. */
  willDecline: boolean
  quote: Omit<QuoteRecord, 'consumedBy' | 'userId'>
}

export type WalletRecord = Wallet & { userId: string }
export type WalletSessionRecord = WalletSession & { userId: string }

export type IdempotencyRecord = { orderId: string; bodyHash: string }

/** Gatilhos de uma vez só dos cenários (ex.: o preço sobe só na primeira cotação). */
export type ScenarioFlags = {
  priceChangeFired: boolean
  soldOutFired: boolean
  orderTimeoutFired: boolean
}

export type DbState = {
  schemaVersion: 1
  users: UserRecord[]
  sessions: SessionRecord[]
  nfts: NftRecord[]
  /** userId → ids de NFT, do mais recente para o mais antigo. */
  favorites: Record<string, string[]>
  carts: CartRecord[]
  quotes: QuoteRecord[]
  orders: OrderRecord[]
  /** `${userId}:${idempotencyKey}` → pedido. */
  idempotency: Record<string, IdempotencyRecord>
  wallets: WalletRecord[]
  walletSessions: WalletSessionRecord[]
  flags: ScenarioFlags
}
