import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { connectWallet, createWallet, disconnectWallet, fetchWallets, fetchWalletSession, updateWallet } from '@/features/wallets/api'
import type { Wallet, WalletInput, WalletSession, WalletSessionInput, WalletUpdate } from '@/shared/contracts'
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

type SaveWallet = { walletId: string; input: WalletUpdate } | { walletId?: undefined; input: WalletInput }

/** Cadastra (POST) ou edita (PATCH) a carteira de uma posição. A resposta substitui o item na lista. */
export function useSaveWallet(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ walletId, input }: SaveWallet) =>
      walletId ? updateWallet(walletId, input) : createWallet(input as WalletInput),
    onSuccess: (wallet) => {
      queryClient.setQueryData<Wallet[]>(walletKeys.list(userId), (current = []) =>
        [...current.filter((item) => item.id !== wallet.id), wallet].sort(
          (a, b) => Number(b.slot === 'primary') - Number(a.slot === 'primary'),
        ),
      )
    },
  })
}
