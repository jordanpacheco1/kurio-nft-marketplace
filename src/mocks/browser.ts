import { setupWorker } from 'msw/browser'
import { installDevtools } from '@/mocks/devtools/kurio'
import { authHandlers } from '@/mocks/handlers/auth'
import { cartHandlers } from '@/mocks/handlers/cart'
import { checkoutHandlers } from '@/mocks/handlers/checkout'
import { favoriteHandlers, nftHandlers } from '@/mocks/handlers/nfts'
import { profileHandlers } from '@/mocks/handlers/profile'
import { walletHandlers } from '@/mocks/handlers/wallets'
import { resumePendingOrders } from '@/mocks/realtime/orders'
import { realtimeHandler } from '@/mocks/realtime/server'
import { initScenarios } from '@/mocks/scenarios/registry'

export const handlers = [
  ...authHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...checkoutHandlers,
  ...walletHandlers,
  ...profileHandlers,
]

export const worker = setupWorker(...handlers, realtimeHandler)

export async function startMocks() {
  initScenarios()
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
  resumePendingOrders()
  installDevtools()
  void import('@/mocks/devtools/mount').then(({ mountScenarioPanel }) => mountScenarioPanel())
}
