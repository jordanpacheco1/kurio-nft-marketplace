import { z } from 'zod'
import { api } from '@/shared/api/client'
import {
  walletListSchema,
  walletSchema,
  walletSessionSchema,
  type WalletInput,
  type WalletSessionInput,
  type WalletUpdate,
} from '@/shared/contracts'

export async function fetchWallets(signal?: AbortSignal) {
  const { data } = await api.get('/me/wallets', { signal })
  return walletListSchema.parse(data).items
}

export async function createWallet(input: WalletInput) {
  const { data } = await api.post('/me/wallets', input)
  return walletSchema.parse(data)
}

export async function updateWallet(walletId: string, input: WalletUpdate) {
  const { data } = await api.patch(`/me/wallets/${encodeURIComponent(walletId)}`, input)
  return walletSchema.parse(data)
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
