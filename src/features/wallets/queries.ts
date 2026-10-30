import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { connectWallet, disconnectWallet, fetchWallets, fetchWalletSession } from '@/features/wallets/api'
import type { WalletSession, WalletSessionInput } from '@/shared/contracts'
import { announce } from '@/shared/ui/announcer'

export const walletKeys = {
  list: (userId: string) => ['me', userId, 'wallets'] as const,
  session: (userId: string) => ['me', userId, 'wallet-session'] as const,
}

export const walletsQuery = (userId: string) =>
  queryOptions({
    queryKey: walletKeys.list(userId),
    queryFn: ({ signal }) => fetchWallets(signal),
    staleTime: 30_000,
  })

/** Conexão simulada com a extensão da carteira (uma por usuário). */
export const walletSessionQuery = (userId: string) =>
  queryOptions({
    queryKey: walletKeys.session(userId),
    queryFn: ({ signal }) => fetchWalletSession(signal),
    staleTime: 0,
  })

export function useConnectWallet(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: WalletSessionInput & { label: string }) =>
      connectWallet({ walletId: input.walletId, network: input.network }),
    onSuccess: (session, input) => {
      queryClient.setQueryData<WalletSession | null>(walletKeys.session(userId), session)
      announce(`Carteira ${input.label} conectada`)
    },
  })
}

export function useDisconnectWallet(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (session: WalletSession) => disconnectWallet(session.id),
    onSuccess: () => {
      queryClient.setQueryData<WalletSession | null>(walletKeys.session(userId), null)
      announce('Carteira desconectada')
    },
  })
}
