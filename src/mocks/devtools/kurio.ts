import { db, persist, resetDb } from '@/mocks/db/store'
import { emitDuplicates, emitNftUpdate } from '@/mocks/realtime/emitters'
import { clearSettlements } from '@/mocks/realtime/orders'
import { connectedClients, dropSocket } from '@/mocks/realtime/server'
import { clearForcedFailures, failNext } from '@/mocks/scenarios/network'
import {
  getScenario,
  getSeed,
  SCENARIOS,
  setLatency,
  setScenario,
  type ScenarioId,
} from '@/mocks/scenarios/registry'

/** Restaura o banco da seed e o cenário (o atual, ou o informado). Pedidos em andamento são descartados. */
function reset(scenario: ScenarioId = getScenario(), seed = getSeed()) {
  clearSettlements()
  clearForcedFailures()
  setLatency(null)
  resetDb()
  setScenario(scenario, seed)
  dropSocket(0) // os clientes reconectam e reconciliam com o REST
}

/** Vence todas as sessões agora: a próxima requisição autenticada recebe 401 SESSION_EXPIRED. */
function expireSession() {
  const past = new Date(Date.now() - 1000).toISOString()
  for (const session of db.sessions) session.expiresAt = past
  persist()
}

// Superfície de controle para testes e demonstração. Só existe com os mocks ligados; o app nunca a chama.
// Tudo que muda dados passa pelo banco e pelo socket, como um backend de verdade faria.
const kurio = {
  reset,
  setScenario,
  getScenario,
  scenarios: () => Object.keys(SCENARIOS) as ScenarioId[],
  setLatency,
  failNext,
  emitNftUpdate,
  emitDuplicates,
  dropSocket,
  expireSession,
  connectedClients,
}

export type KurioDevtools = typeof kurio

declare global {
  interface Window {
    __kurio?: KurioDevtools
  }
}

export function installDevtools() {
  window.__kurio = kurio
}
