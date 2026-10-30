import type { Cart, CartItem, Coupon, Network, NftDetail, NftSummary, Profile, User } from '@/shared/contracts'
import { addEth, mulEth, percentOf, subEth } from '@/shared/money'
import { db } from '@/mocks/db/store'
import type { CartRecord, NftRecord, UserRecord } from '@/mocks/db/types'

// Conversão dos registros do banco para os contratos da API, e regras de preço.

export const NETWORK_FEE: Record<Network, string> = { ethereum: '0.016', polygon: '0.002', solana: '0.001' }

/** Regra fixa do mock: dois cupons válidos, um expirado e o resto é inválido. */
export const COUPONS: Record<string, { percent: number; expired: boolean }> = {
  KURIO10: { percent: 10, expired: false },
  GENESIS5: { percent: 5, expired: false },
  EXPIRADO: { percent: 15, expired: true },
}

export function couponFor(code: string | null): Coupon | null {
  if (!code) return null
  const coupon = COUPONS[code]
  return coupon && !coupon.expired ? { code, percent: coupon.percent } : null
}

export const findNft = (id: string) => db.nfts.find((nft) => nft.id === id)

export function toSummary(nft: NftRecord): NftSummary {
  return {
    id: nft.id,
    name: nft.name,
    tokenId: nft.tokenId,
    collection: nft.collection,
    network: nft.network,
    image: nft.image,
    priceEth: nft.editions[0]!.priceEth,
    available: nft.editions.reduce((sum, edition) => sum + edition.available, 0),
    rare: nft.rare,
    listedAt: nft.listedAt,
    version: nft.version,
  }
}

export function toDetail(nft: NftRecord): NftDetail {
  return {
    ...toSummary(nft),
    description: nft.description,
    series: nft.series,
    creator: nft.creator,
    attributes: nft.attributes,
    rating: nft.rating,
    gallery: nft.gallery,
    editions: nft.editions,
  }
}

export function toUser(user: UserRecord): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  }
}

export function toProfile(user: UserRecord): Profile {
  return {
    userId: user.id,
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    ensName: user.ensName,
    walletNickname: user.walletNickname,
    avatarUrl: user.avatarUrl,
  }
}

/** Totais com as regras da API. O desconto é sobre o subtotal; a taxa de rede não tem desconto. */
export function totals(lineTotals: string[], coupon: Coupon | null, network: Network) {
  const subtotalEth = addEth(...lineTotals)
  const discountEth = coupon ? percentOf(subtotalEth, coupon.percent) : '0'
  const networkFeeEth = lineTotals.length ? NETWORK_FEE[network] : '0'
  const totalEth = addEth(subEth(subtotalEth, discountEth), networkFeeEth)
  return { subtotalEth, discountEth, networkFeeEth, totalEth }
}

/** Linhas do carrinho com preço e estoque atuais. Linhas de NFT/edição que sumiram são descartadas. */
export function cartItems(cart: CartRecord): CartItem[] {
  return cart.lines.flatMap((line) => {
    const nft = findNft(line.nftId)
    const edition = nft?.editions.find((item) => item.id === line.editionId)
    if (!nft || !edition) return []
    return [
      {
        id: `${line.nftId}:${line.editionId}`,
        nftId: nft.id,
        editionId: edition.id,
        name: nft.name,
        tokenId: nft.tokenId,
        image: nft.image,
        editionLabel: edition.label,
        quantity: line.quantity,
        unitPriceEth: edition.priceEth,
        lineTotalEth: mulEth(edition.priceEth, line.quantity),
        available: edition.available,
        version: edition.version,
      },
    ]
  })
}

export function toCart(cart: CartRecord): Cart {
  const items = cartItems(cart)
  const coupon = couponFor(cart.couponCode)
  const { subtotalEth, discountEth, networkFeeEth, totalEth } = totals(
    items.map((item) => item.lineTotalEth),
    coupon,
    'ethereum',
  )
  return {
    id: cart.id,
    items,
    coupon,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalEth,
    discountEth,
    estimatedNetworkFeeEth: networkFeeEth,
    totalEth,
  }
}
