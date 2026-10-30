import type { NftSummary } from '@/shared/contracts/nft'

// Seed mínima da Fase 1; o banco completo (40+ NFTs, persistência, reset) vem na Fase 2.
export const nfts: NftSummary[] = [
  { id: 'emerald-ape-042', name: 'Emerald Ape #042', collection: 'Kurio Apes', image: 'ape-emerald', priceEth: '1.19', version: 1 },
  { id: 'sage-nomad-009', name: 'Sage Nomad #009', collection: 'Kurio Apes', image: 'ape-nomad', priceEth: '1.69', version: 1 },
  { id: 'neon-vessel-552', name: 'Neon Vessel #552', collection: 'Kurio Editions', image: 'ape-ivory', priceEth: '1.99', version: 1 },
  { id: 'golden-beat-207', name: 'Golden Beat #207', collection: 'Kurio Editions', image: 'ape-golden', priceEth: '0.99', version: 1 },
]
