import { HttpResponse } from 'msw'
import {
  walletInputSchema,
  walletSessionInputSchema,
  walletUpdateSchema,
  type Wallet,
  type WalletList,
  type WalletSession,
} from '@/shared/contracts'
import { db } from '@/mocks/db/store'
import type { WalletRecord, WalletSessionRecord } from '@/mocks/db/types'
import { fail, noContent, readBody, requireUser, route } from '@/mocks/handlers/http'
import { isScenarioActive } from '@/mocks/scenarios/registry'

const toWallet = ({ userId: _userId, ...wallet }: WalletRecord): Wallet => wallet
const toSession = ({ userId: _userId, ...session }: WalletSessionRecord): WalletSession => session

/** Carteira de outro usuário responde como inexistente (404), para não revelar que existe. */
function requireWallet(userId: string, walletId: string) {
  const wallet = db.wallets.find((item) => item.id === walletId && item.userId === userId)
  if (!wallet) fail('NOT_FOUND', 'Carteira não encontrada.')
  return wallet
}

/** Regra fixa do mock: o mesmo endereço não pode estar em duas contas (dá para repetir entre as suas carteiras). */
function assertAddressFree(userId: string, address: string | undefined) {
  if (!address) return
  if (db.wallets.some((item) => item.userId !== userId && item.address.toLowerCase() === address.toLowerCase())) {
    fail('CONFLICT', 'Este endereço já está ligado a outra conta.', {
      fields: { address: 'Endereço já cadastrado em outra conta' },
    })
  }
}

export const walletHandlers = [
  route('get', '/me/wallets', ({ request }) => {
    const { user } = requireUser(request)
    const items = db.wallets.filter((item) => item.userId === user.id).sort((a, b) => Number(b.slot === 'primary') - Number(a.slot === 'primary'))
    return HttpResponse.json<WalletList>({ items: items.map(toWallet) })
  }),

  route('post', '/me/wallets', async ({ request }) => {
    const { user } = requireUser(request)
    const input = await readBody(request, walletInputSchema)
    if (db.wallets.some((item) => item.userId === user.id && item.slot === input.slot)) {
      fail('CONFLICT', 'Você já tem uma carteira nesta posição. Edite a existente.', {
        fields: { slot: 'Posição já ocupada' },
      })
    }
    assertAddressFree(user.id, input.address)
    const wallet: WalletRecord = {
      ...input,
      id: `w-${crypto.randomUUID().slice(0, 8)}`,
      userId: user.id,
      updatedAt: new Date().toISOString(),
    }
    db.wallets.push(wallet)
    return HttpResponse.json<Wallet>(toWallet(wallet), { status: 201 })
  }),

  route('patch', '/me/wallets/:id', async ({ request, params }) => {
    const { user } = requireUser(request)
    const wallet = requireWallet(user.id, params.id!)
    const input = await readBody(request, walletUpdateSchema)
    assertAddressFree(user.id, input.address)
    Object.assign(wallet, input, { updatedAt: new Date().toISOString() })
    return HttpResponse.json<Wallet>(toWallet(wallet))
  }),

  // Conexão simulada com a extensão: aprovada, ou recusada no cenário wallet-rejected.
  route('get', '/wallet-sessions/current', ({ request }) => {
    const { user } = requireUser(request)
    const session = db.walletSessions.find((item) => item.userId === user.id)
    return HttpResponse.json<{ session: WalletSession | null }>({ session: session ? toSession(session) : null })
  }),

  route('post', '/wallet-sessions', async ({ request }) => {
    const { user } = requireUser(request)
    const input = await readBody(request, walletSessionInputSchema)
    const wallet = requireWallet(user.id, input.walletId)
    if (isScenarioActive('wallet-rejected')) fail('FORBIDDEN', 'A conexão foi recusada na carteira.')
    const session: WalletSessionRecord = {
      id: `ws-${crypto.randomUUID().slice(0, 8)}`,
      walletId: wallet.id,
      network: input.network,
      connectedAt: new Date().toISOString(),
      userId: user.id,
    }
    // Uma conexão por usuário: conectar outra carteira desconecta a anterior.
    db.walletSessions = [...db.walletSessions.filter((item) => item.userId !== user.id), session]
    return HttpResponse.json<WalletSession>(toSession(session), { status: 201 })
  }),

  route('delete', '/wallet-sessions/:id', ({ request, params }) => {
    const { user } = requireUser(request)
    const session = db.walletSessions.find((item) => item.id === params.id && item.userId === user.id)
    if (!session) fail('NOT_FOUND', 'Conexão não encontrada.')
    db.walletSessions = db.walletSessions.filter((item) => item !== session)
    return noContent()
  }),
]
