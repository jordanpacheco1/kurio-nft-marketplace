import type { Collection, Edition, EditionLabel, Network, NftImage } from '@/shared/contracts'
import { fromWei, toWei } from '@/shared/money'
import { createPrng } from '@/mocks/scenarios/prng'
import type { DbState, NftRecord } from '@/mocks/db/types'

// Seed determinística. Os fixtures usam uma seed fixa (não a `?seed=`) para a regressão visual
// ter sempre os mesmos dados; a `?seed=` controla só a aleatoriedade dos cenários.
const FIXTURE_SEED = 2026

const COLLECTIONS: Collection[] = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
]
const NETWORKS: Network[] = ['ethereum', 'polygon', 'solana']
const IMAGES: NftImage[] = ['ape-emerald', 'ape-nomad', 'ape-golden', 'ape-ivory']

/** Preço relativo de cada edição, em % da 1/1. */
const EDITION_FACTOR: Record<EditionLabel, number> = { '1/1': 100, '1/10': 60, '1/50': 35, Aberta: 15 }
const EDITION_ID: Record<EditionLabel, string> = { '1/1': 'e1', '1/10': 'e10', '1/50': 'e50', Aberta: 'open' }
const EDITION_SETS: EditionLabel[][] = [
  ['1/1', '1/10', '1/50', 'Aberta'],
  ['1/1'],
  ['1/1', '1/10'],
  ['1/10', '1/50', 'Aberta'],
  ['1/50', 'Aberta'],
  ['Aberta'],
]

type Blueprint = {
  name: string
  priceEth: string
  image: NftImage
  series: string
  editions?: EditionLabel[]
  collection?: Collection
  network?: Network
}

// Os 9 NFTs do Figma, com os preços do layout. Vêm primeiro em "Listados recentemente".
const DESIGN: Blueprint[] = [
  { name: 'Emerald Ape #042', priceEth: '1.19', image: 'ape-emerald', series: 'Kurio Apes', collection: 'arte-digital', network: 'ethereum' },
  { name: 'Sage Nomad #009', priceEth: '1.69', image: 'ape-nomad', series: 'Kurio Apes', collection: 'arte-digital', network: 'ethereum' },
  { name: 'Neon Vessel #552', priceEth: '1.99', image: 'ape-ivory', series: 'Kurio Editions', collection: 'arte-3d', network: 'polygon' },
  { name: 'Cosmic Bloom #118', priceEth: '1.29', image: 'ape-nomad', series: 'Kurio Apes', collection: 'generativa', network: 'ethereum' },
  { name: 'Violet Nomad #314', priceEth: '1.39', image: 'ape-nomad', series: 'Kurio Apes', collection: 'colecionaveis', network: 'solana' },
  { name: 'Ivory Baron #088', priceEth: '1.79', image: 'ape-ivory', series: 'Kurio Apes', collection: 'arte-digital', network: 'ethereum' },
  { name: 'Golden Beat #207', priceEth: '0.99', image: 'ape-golden', series: 'Kurio Editions', collection: 'musica', network: 'polygon' },
  { name: 'Golden Frequency #071', priceEth: '0.59', image: 'ape-golden', series: 'Kurio Editions', collection: 'musica', network: 'ethereum' },
  { name: 'Golden Signal #160', priceEth: '0.39', image: 'ape-golden', series: 'Kurio Editions', collection: 'musica', network: 'solana' },
]

const ADJECTIVES = ['Amber', 'Cobalt', 'Crimson', 'Lunar', 'Solar', 'Velvet', 'Onyx', 'Copper', 'Silver', 'Atomic', 'Quiet', 'Wild']
const NOUNS: { noun: string; image: NftImage; series: string }[] = [
  { noun: 'Ape', image: 'ape-emerald', series: 'Kurio Apes' },
  { noun: 'Nomad', image: 'ape-nomad', series: 'Kurio Apes' },
  { noun: 'Baron', image: 'ape-ivory', series: 'Kurio Apes' },
  { noun: 'Bloom', image: 'ape-nomad', series: 'Kurio Apes' },
  { noun: 'Vessel', image: 'ape-ivory', series: 'Kurio Editions' },
  { noun: 'Beat', image: 'ape-golden', series: 'Kurio Editions' },
  { noun: 'Echo', image: 'ape-golden', series: 'Kurio Editions' },
  { noun: 'Relic', image: 'ape-ivory', series: 'Kurio Relics' },
  { noun: 'Prism', image: 'ape-emerald', series: 'Kurio Relics' },
  { noun: 'Cipher', image: 'ape-golden', series: 'Kurio Relics' },
]
const CREATORS = ['@estudio.kurio', '@lia.vetor', '@caio.pixel', '@marte.lab', '@nina.forja']
const BACKGROUNDS = ['Esmeralda', 'Cobre', 'Areia', 'Noite', 'Ferrugem', 'Marfim']
const ACCESSORIES = ['Óculos', 'Chapéu', 'Fone', 'Blazer', 'Corrente', 'Nenhum']

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/#/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const centsToEth = (cents: number) => fromWei(toWei(`${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`))
const ethToCents = (eth: string) => Math.round(Number(eth) * 100) // só na seed, com 2 casas fixas

function buildNfts(): NftRecord[] {
  const prng = createPrng(FIXTURE_SEED)
  const blueprints: Blueprint[] = [...DESIGN]

  // 33 gerados: 42 no total, 5 páginas de 9. Os extremos da faixa de preço do Figma (0.02 e 12.30) estão garantidos.
  const forcedPrices = ['0.02', '12.30']
  for (let i = 0; blueprints.length < 42; i++) {
    const { noun, image, series } = NOUNS[i % NOUNS.length]!
    const adjective = ADJECTIVES[(i * 5) % ADJECTIVES.length]!
    const number = String(prng.int(1, 999)).padStart(3, '0')
    const priceEth = forcedPrices[i] ?? centsToEth(prng.int(2, 1230))
    blueprints.push({
      name: `${adjective} ${noun} #${number}`,
      priceEth,
      image,
      series,
      editions: prng.pick(EDITION_SETS),
    })
  }

  const listedBase = Date.parse('2026-10-29T15:00:00Z')

  return blueprints.map((bp, index): NftRecord => {
    const id = slug(bp.name)
    const labels = bp.editions ?? EDITION_SETS[0]!
    const defaultFactor = EDITION_FACTOR[labels[0]!]
    const baseCents = ethToCents(bp.priceEth)
    // O 34º NFT fica todo esgotado; a 1/1 do Golden Signal também (cenários de edição indisponível).
    const soldOut = index === 33

    const editions: Edition[] = labels.map((label) => {
      const cents = Math.max(1, Math.round((baseCents * EDITION_FACTOR[label]) / defaultFactor))
      const supply = label === '1/1' ? 1 : label === '1/10' ? 10 : label === '1/50' ? 50 : null
      let available = supply === null ? 999 : supply === 1 ? 1 : prng.int(2, supply)
      if (soldOut || (id === 'golden-signal-160' && label === '1/1')) available = 0
      if (id === 'emerald-ape-042') available = { '1/1': 1, '1/10': 7, '1/50': 32, Aberta: 999 }[label]
      return { id: EDITION_ID[label], label, supply, available, priceEth: centsToEth(cents), version: 1 }
    })

    const rare = labels.length === 1 && labels[0] === '1/1' ? true : index < 9 ? index % 3 === 0 : prng.chance(0.25)
    const others = IMAGES.filter((image) => image !== bp.image)

    return {
      id,
      name: bp.name,
      tokenId: `#${bp.name.split('#')[1]!.padStart(4, '0')}`,
      collection: bp.collection ?? prng.pick(COLLECTIONS),
      network: bp.network ?? prng.pick(NETWORKS),
      image: bp.image,
      rare,
      listedAt: new Date(listedBase - index * 18 * 3_600_000).toISOString(),
      version: 1,
      description:
        `${bp.name} faz parte da série ${bp.series}. Cada peça é cunhada sob demanda e acompanha ` +
        'o arquivo em alta resolução e a licença de exibição pessoal.',
      series: bp.series,
      creator: CREATORS[index % CREATORS.length]!,
      attributes:
        id === 'emerald-ape-042'
          ? [
              { trait: 'Acessório', value: 'Óculos' },
              { trait: 'Fundo', value: 'Esmeralda' },
              { trait: 'Raridade', value: 'Raro' },
            ]
          : [
              { trait: 'Acessório', value: prng.pick(ACCESSORIES) },
              { trait: 'Fundo', value: prng.pick(BACKGROUNDS) },
              { trait: 'Raridade', value: rare ? 'Raro' : 'Comum' },
            ],
      rating:
        id === 'emerald-ape-042'
          ? { average: 4.5, count: 19 }
          : { average: prng.int(35, 50) / 10, count: prng.int(0, 120) },
      gallery: [bp.image, ...others],
      editions,
      trendingScore: index < 9 ? 90 - index * 4 : prng.int(10, 95),
    }
  })
}

// Hashes PBKDF2 (SHA-256, 100 mil iterações) da senha `Kurio@2026`, pré-calculados para o reset ser síncrono.
const SEED_PASSWORD = {
  u1: {
    salt: '6b7572696f2d75736572312d73616c74',
    hash: 'caa37155291e75471837d6330fb4d68189c375285e8ac1ae748159763c2dfeb1',
  },
  u2: {
    salt: '6b7572696f2d75736572322d73616c74',
    hash: '7e61f416dbdb755c678a7b5e83493d3945412d9a5b0a175032d5b21370bbb124',
  },
}

export function createSeed(): DbState {
  const seededAt = '2026-10-29T15:00:00.000Z'
  return {
    schemaVersion: 1,
    users: [
      {
        id: 'u1',
        username: 'colecionador',
        email: 'colecionador@kurio.test',
        displayName: 'Rafa Colecionador',
        ensName: 'rafa.kurio.eth',
        walletNickname: 'Principal',
        avatarUrl: null,
        passwordSalt: SEED_PASSWORD.u1.salt,
        passwordHash: SEED_PASSWORD.u1.hash,
      },
      {
        id: 'u2',
        username: 'curadora',
        email: 'curadora@kurio.test',
        displayName: 'Bia Curadora',
        ensName: null,
        walletNickname: null,
        avatarUrl: null,
        passwordSalt: SEED_PASSWORD.u2.salt,
        passwordHash: SEED_PASSWORD.u2.hash,
      },
    ],
    sessions: [],
    nfts: buildNfts(),
    favorites: { u1: ['sage-nomad-009', 'golden-beat-207'], u2: ['neon-vessel-552'] },
    carts: [],
    quotes: [],
    orders: [],
    idempotency: {},
    wallets: [
      {
        id: 'w-u1-primary',
        userId: 'u1',
        slot: 'primary',
        label: 'Principal',
        address: '0xA91F3c7d5B2e8F0a4C6d1E9b7A3f5D2c8B04E82C',
        network: 'ethereum',
        provider: 'metamask',
        updatedAt: seededAt,
      },
      {
        id: 'w-u1-secondary',
        userId: 'u1',
        slot: 'secondary',
        label: 'Reserva',
        address: 'nova.kurio.eth',
        network: 'polygon',
        provider: 'coinbase',
        updatedAt: seededAt,
      },
    ],
    walletSessions: [],
    flags: { priceChangeFired: false, soldOutFired: false, orderTimeoutFired: false },
  }
}
