import { z } from 'zod'
import { api } from '@/shared/api/client'
import { walletListSchema, walletSessionSchema, type WalletSessionInput } from '@/shared/contracts'

export async function fetchWallets(signal?: AbortSignal) {
  const { data } = await api.get('/me/wallets', { signal })
  return walletListSchema.parse(data).items
}

export async function fetchWalletSession(signal?: AbortSignal) {
  const { data } = await api.get('/wallet-sessions/current', { signal })
  return z.object({ session: walletSessionSchema.nullable() }).parse(data).session
}

export async function connectWallet(input: WalletSessionInput) {
  const { data } = await api.post('/wallet-sessions', input)
  return walletSessionSchema.parse(data)
}

export async function disconnectWallet(sessionId: string) {
  await api.delete(`/wallet-sessions/${encodeURIComponent(sessionId)}`)
}
