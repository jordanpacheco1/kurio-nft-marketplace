import { createSeed } from '@/mocks/db/seed'
import type { DbState } from '@/mocks/db/types'

// Banco em memória, persistido inteiro no localStorage para sobreviver ao refresh.
// Cada aba tem a própria cópia (o MSW roda na página); a última que gravar vence.
const STORAGE_KEY = 'kurio.mockdb.v1'

function load(): DbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DbState
      if (parsed.schemaVersion === 1) return parsed
    }
  } catch {
    // Storage bloqueado ou JSON corrompido: começa da seed.
  }
  return createSeed()
}

export let db: DbState = load()

export function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // Sem storage (aba anônima com cota zerada, por exemplo): segue só em memória.
  }
}

/** Volta à seed. Quem chama cuida de timers e sockets (ver `mocks/devtools`). */
export function resetDb() {
  db = createSeed()
  persist()
}
