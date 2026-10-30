import { setupWorker } from 'msw/browser'
import { installDevtools } from '@/mocks/devtools/kurio'
import { nftHandlers } from '@/mocks/handlers/nfts'
import { realtimeHandler } from '@/mocks/realtime/server'

export const worker = setupWorker(...nftHandlers, realtimeHandler)

export async function startMocks() {
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
  installDevtools()
}
