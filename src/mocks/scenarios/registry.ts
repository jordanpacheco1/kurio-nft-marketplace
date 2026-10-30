import { db, persist } from '@/mocks/db/store'
import { createPrng, type Prng } from '@/mocks/scenarios/prng'

export const SCENARIOS = {
  default: 'Latência de 50–150 ms; o pagamento confirma em ~2 s',
  slow: 'Latência de 1,5–3 s em todas as respostas',
  flaky: '30% das respostas com 503 (sorteadas pela seed)',
  offline: 'Falha de conexão em todas as requisições',
  'out-of-order': 'Buscas mais curtas demoram mais (respostas fora de ordem)',
  empty: 'Catálogo vazio',
  'session-expired': 'A sessão expira 30 s depois do login',
  'price-change': 'O preço de um item do carrinho sobe logo depois da primeira cotação',
  'sold-out': 'Uma edição do carrinho esgota ao confirmar a compra',
  'order-timeout': 'O pedido é criado, mas a resposta demora mais que o timeout do cliente',
  'payment-declined': 'O pagamento é recusado',
  'wallet-rejected': 'A carteira recusa a conexão',
} as const

export type ScenarioId = keyof typeof SCENARIOS

const SCENARIO_KEY = 'kurio.scenario'
const SEED_KEY = 'kurio.seed'
const DEFAULT_SEED = 2026

const isScenario = (value: string | null): value is ScenarioId => !!value && value in SCENARIOS

function readStorage(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Sem storage: o cenário vale só até o refresh.
  }
}

const state = {
  scenario: 'default' as ScenarioId,
  seed: DEFAULT_SEED,
  latencyMs: null as number | null,
  prng: createPrng(DEFAULT_SEED),
}

/** Lê `?scenario=` e `?seed=` da URL (que têm prioridade) ou o que ficou no localStorage. */
export function initScenarios() {
  const params = new URLSearchParams(location.search)
  const fromUrl = params.get('scenario')
  const stored = readStorage(SCENARIO_KEY)
  state.scenario = isScenario(fromUrl) ? fromUrl : isScenario(stored) ? stored : 'default'
  const seed = Number(params.get('seed') ?? readStorage(SEED_KEY) ?? DEFAULT_SEED)
  state.seed = Number.isSafeInteger(seed) ? seed : DEFAULT_SEED
  writeStorage(SCENARIO_KEY, state.scenario)
  writeStorage(SEED_KEY, String(state.seed))
  state.prng = createPrng(state.seed)
}

// Sorteios da rede por requisição: a n-ésima vez que `GET /api/nfts?page=2` passa tem sempre o mesmo
// resultado para a mesma seed, não importa quantas outras requisições o app fez no meio.
const occurrences = new Map<string, number>()

function hash(text: string) {
  let h = 2166136261 // FNV-1a
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

export function prngFor(key: string): Prng {
  const n = occurrences.get(key) ?? 0
  occurrences.set(key, n + 1)
  return createPrng(hash(`${state.seed}|${key}|${n}`))
}

export const getScenario = () => state.scenario
export const getSeed = () => state.seed
export const getLatencyOverride = () => state.latencyMs
export const prng = (): Prng => state.prng
export const isScenarioActive = (id: ScenarioId) => state.scenario === id

/** Troca o cenário, reinicia o PRNG e rearma os gatilhos de uma vez só. */
export function setScenario(id: ScenarioId, seed = state.seed) {
  if (!isScenario(id)) throw new Error(`Cenário inexistente: ${id}. Use um de: ${Object.keys(SCENARIOS).join(', ')}`)
  state.scenario = id
  state.seed = seed
  state.prng = createPrng(seed)
  occurrences.clear()
  writeStorage(SCENARIO_KEY, id)
  writeStorage(SEED_KEY, String(seed))
  db.flags = { priceChangeFired: false, soldOutFired: false, orderTimeoutFired: false }
  persist()
}

/** Latência fixa em ms para todas as respostas REST (`null` volta à do cenário). Não persiste. */
export function setLatency(ms: number | null) {
  state.latencyMs = ms
}
