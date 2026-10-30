import { emitNftUpdate } from '@/mocks/realtime/emitters'
import { connectedClients } from '@/mocks/realtime/server'

// Superfície de controle para testes e demonstração. Só existe com os mocks ligados; o app nunca a chama.
const kurio = { emitNftUpdate, connectedClients }

export type KurioDevtools = typeof kurio

declare global {
  interface Window {
    __kurio?: KurioDevtools
  }
}

export function installDevtools() {
  window.__kurio = kurio
}
