import { expect, test } from '@playwright/test'
import {
  apiErrorBodySchema,
  cartSchema,
  currentSessionSchema,
  favoritesSchema,
  featuredSchema,
  mergeCartResultSchema,
  nftDetailSchema,
  nftListSchema,
  orderSchema,
  profileSchema,
  quoteSchema,
  relatedSchema,
  sessionSchema,
  walletListSchema,
  walletSchema,
  walletSessionSchema,
  type Cart,
  type NftList,
  type Order,
  type Quote,
} from '../src/shared/contracts'
import { addEth, compareEth, mulEth, percentOf, subEth } from '../src/shared/money'
import { bootMocks, call, login, PASSWORD } from './support/api'

// Contrato da API simulada: cada resposta passa pelo service worker do MSW e é validada com os
// mesmos schemas Zod que o app usa. Regras de API não dependem de viewport: só no projeto desktop.
test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'contrato da API roda só no desktop')
  await bootMocks(page)
})

const expectError = (body: unknown, code: string) => {
  const parsed = apiErrorBodySchema.parse(body)
  expect(parsed.error.code).toBe(code)
  return parsed.error
}

test.describe('catálogo', () => {
  test('lista paginada com facetas calculadas dos fixtures', async ({ page }) => {
    const { status, body } = await call(page, 'GET', '/nfts')
    expect(status).toBe(200)
    const list = nftListSchema.parse(body)
    expect(list).toMatchObject({ page: 1, pageSize: 9, total: 42, totalPages: 5 })
    expect(list.items).toHaveLength(9)
    expect(list.items[0]!.name).toBe('Emerald Ape #042') // "Listados recentemente"
    expect(list.facets.collections.reduce((sum, facet) => sum + facet.count, 0)).toBe(42)
    expect(list.facets.networks.reduce((sum, facet) => sum + facet.count, 0)).toBe(42)
    expect(list.facets.price).toEqual({ min: '0.02', max: '12.3' })

    const last = nftListSchema.parse((await call(page, 'GET', '/nfts?page=5')).body)
    expect(last.items).toHaveLength(6)
  })

  test('filtros combinados, busca e ordenação', async ({ page }) => {
    const { body } = await call<NftList>(page, 'GET', '/nfts?networks=ethereum&networks=polygon&min=0.5&max=2&sort=price-asc&pageSize=48')
    const list = nftListSchema.parse(body)
    expect(list.total).toBeGreaterThan(0)
    for (const nft of list.items) {
      expect(['ethereum', 'polygon']).toContain(nft.network)
      expect(compareEth(nft.priceEth, '0.5')).toBeGreaterThanOrEqual(0)
      expect(compareEth(nft.priceEth, '2')).toBeLessThanOrEqual(0)
    }
    const prices = list.items.map((nft) => nft.priceEth)
    expect([...prices].sort(compareEth)).toEqual(prices)

    // A faceta de rede ignora o próprio filtro: mostra quantos haveria em cada rede.
    const solana = list.facets.networks.find((facet) => facet.id === 'solana')!
    expect(solana.count).toBeGreaterThan(0)

    const golden = nftListSchema.parse((await call(page, 'GET', '/nfts?q=golden')).body)
    expect(golden.items.map((nft) => nft.name)).toEqual(
      expect.arrayContaining(['Golden Beat #207', 'Golden Frequency #071', 'Golden Signal #160']),
    )

    const none = nftListSchema.parse((await call(page, 'GET', '/nfts?q=zzzz')).body)
    expect(none).toMatchObject({ total: 0, totalPages: 1, items: [] })

    const invalid = await call(page, 'GET', '/nfts?sort=preco')
    expect(invalid.status).toBe(422)
    expect(expectError(invalid.body, 'VALIDATION_ERROR').fields).toHaveProperty('sort')
  })

  test('detalhe, destaques, relacionados e NFT inexistente', async ({ page }) => {
    const detail = nftDetailSchema.parse((await call(page, 'GET', '/nfts/emerald-ape-042')).body)
    expect(detail.editions.map((edition) => edition.label)).toEqual(['1/1', '1/10', '1/50', 'Aberta'])
    expect(detail.priceEth).toBe('1.19')
    expect(detail.rating.count).toBe(19)

    const soldOut = nftDetailSchema.parse((await call(page, 'GET', '/nfts/golden-signal-160')).body)
    expect(soldOut.editions[0]).toMatchObject({ label: '1/1', available: 0 })

    featuredSchema.parse((await call(page, 'GET', '/nfts/featured')).body)
    const related = relatedSchema.parse((await call(page, 'GET', '/nfts/emerald-ape-042/related')).body)
    expect(related.items.map((nft) => nft.id)).not.toContain('emerald-ape-042')

    const missing = await call(page, 'GET', '/nfts/nao-existe')
    expect(missing.status).toBe(404)
    expectError(missing.body, 'NOT_FOUND')
  })
})

test.describe('sessão e conta', () => {
  test('login, sessão, logout e erros', async ({ page }) => {
    const wrong = await call(page, 'POST', '/auth/login', { body: { email: 'colecionador@kurio.test', password: 'errada123' } })
    expect(wrong.status).toBe(401)
    expectError(wrong.body, 'UNAUTHENTICATED')

    const ok = await call(page, 'POST', '/auth/login', { body: { email: 'COLECIONADOR@kurio.test', password: PASSWORD } })
    const session = sessionSchema.parse(ok.body)
    const current = await call(page, 'GET', '/auth/session', { token: session.token })
    expect(currentSessionSchema.parse(current.body).user.username).toBe('colecionador')

    expect((await call(page, 'POST', '/auth/logout', { token: session.token })).status).toBe(204)
    const after = await call(page, 'GET', '/auth/session', { token: session.token })
    expect(after.status).toBe(401)
    expectError(after.body, 'UNAUTHENTICATED')
  })

  test('cadastro com validação e conflito', async ({ page }) => {
    const invalid = await call(page, 'POST', '/auth/register', { body: { username: 'A', email: 'x', password: '123' } })
    expect(invalid.status).toBe(422)
    expect(Object.keys(expectError(invalid.body, 'VALIDATION_ERROR').fields ?? {})).toEqual(['username', 'email', 'password'])

    const conflict = await call(page, 'POST', '/auth/register', {
      body: { username: 'colecionador', email: 'colecionador@kurio.test', password: 'Senha1234' },
    })
    expect(conflict.status).toBe(409)
    expect(expectError(conflict.body, 'CONFLICT').fields).toEqual({
      email: 'Este e-mail já está cadastrado',
      username: 'Este nome de usuário já está em uso',
    })

    const created = await call(page, 'POST', '/auth/register', {
      body: { username: 'nova_conta', email: 'nova@kurio.test', password: 'Senha1234' },
    })
    expect(created.status).toBe(201)
    expect(sessionSchema.parse(created.body).user.username).toBe('nova_conta')
  })

  test('sessão expirada responde SESSION_EXPIRED', async ({ page }) => {
    const { token } = await login(page)
    await page.evaluate(() => window.__kurio!.expireSession())
    const expired = await call(page, 'GET', '/me/profile', { token })
    expect(expired.status).toBe(401)
    expectError(expired.body, 'SESSION_EXPIRED')
  })

  test('perfil, avatar e senha', async ({ page }) => {
    const { token } = await login(page)
    profileSchema.parse((await call(page, 'GET', '/me/profile', { token })).body)

    const conflict = await call(page, 'PATCH', '/me/profile', { token, body: { username: 'curadora' } })
    expect(expectError(conflict.body, 'CONFLICT').fields).toHaveProperty('username')

    const badEns = await call(page, 'PATCH', '/me/profile', { token, body: { ensName: 'rafa.com' } })
    expect(expectError(badEns.body, 'VALIDATION_ERROR').fields).toHaveProperty('ensName')

    const updated = profileSchema.parse((await call(page, 'PATCH', '/me/profile', { token, body: { displayName: 'Rafa K.' } })).body)
    expect(updated.displayName).toBe('Rafa K.')

    const avatar = 'data:image/png;base64,iVBORw0KGgo='
    expect(profileSchema.parse((await call(page, 'PUT', '/me/avatar', { token, body: { dataUrl: avatar } })).body).avatarUrl).toBe(avatar)
    expect(profileSchema.parse((await call(page, 'DELETE', '/me/avatar', { token })).body).avatarUrl).toBeNull()

    const wrongCurrent = await call(page, 'POST', '/me/password', { token, body: { currentPassword: 'x', newPassword: 'Nova12345' } })
    expect(expectError(wrongCurrent.body, 'VALIDATION_ERROR').fields).toHaveProperty('currentPassword')
    const changed = await call(page, 'POST', '/me/password', { token, body: { currentPassword: PASSWORD, newPassword: 'Nova12345' } })
    expect(changed.status).toBe(204)
    const relogin = await call(page, 'POST', '/auth/login', { body: { email: 'colecionador@kurio.test', password: 'Nova12345' } })
    expect(relogin.status).toBe(200)
  })

  test('favoritos são isolados por usuário', async ({ page }) => {
    const u1 = await login(page)
    const u2 = await login(page, 'curadora@kurio.test')
    const ids = async (token: string) =>
      favoritesSchema.parse((await call(page, 'GET', '/me/favorites', { token })).body).items.map((nft) => nft.id)

    expect(await ids(u1.token)).toEqual(['sage-nomad-009', 'golden-beat-207'])
    expect(await ids(u2.token)).toEqual(['neon-vessel-552'])

    await call(page, 'PUT', '/me/favorites/emerald-ape-042', { token: u1.token })
    await call(page, 'DELETE', '/me/favorites/sage-nomad-009', { token: u1.token })
    expect(await ids(u1.token)).toEqual(['emerald-ape-042', 'golden-beat-207'])
    expect(await ids(u2.token)).toEqual(['neon-vessel-552'])

    expect((await call(page, 'GET', '/me/favorites')).status).toBe(401)
  })

  test('carteiras e conexão simulada', async ({ page }) => {
    const { token } = await login(page)
    const wallets = walletListSchema.parse((await call(page, 'GET', '/me/wallets', { token })).body)
    expect(wallets.items.map((wallet) => wallet.slot)).toEqual(['primary', 'secondary'])

    const invalid = await call(page, 'PATCH', '/me/wallets/w-u1-primary', { token, body: { address: '0x123' } })
    expect(expectError(invalid.body, 'VALIDATION_ERROR').fields).toHaveProperty('address')

    const updated = walletSchema.parse(
      (await call(page, 'PATCH', '/me/wallets/w-u1-secondary', { token, body: { address: 'reserva.kurio.eth', label: 'Cofre' } })).body,
    )
    expect(updated).toMatchObject({ address: 'reserva.kurio.eth', label: 'Cofre' })

    const taken = await call(page, 'POST', '/me/wallets', {
      token,
      body: { slot: 'primary', label: 'Outra', address: '0x' + 'a'.repeat(40), network: 'ethereum', provider: 'metamask' },
    })
    expect(taken.status).toBe(409)

    const other = await login(page, 'curadora@kurio.test')
    expect((await call(page, 'PATCH', '/me/wallets/w-u1-primary', { token: other.token, body: { label: 'x' } })).status).toBe(404)

    const session = walletSessionSchema.parse(
      (await call(page, 'POST', '/wallet-sessions', { token, body: { walletId: 'w-u1-primary', network: 'ethereum' } })).body,
    )
    expect((await call(page, 'DELETE', `/wallet-sessions/${session.id}`, { token })).status).toBe(204)

    await page.evaluate(() => window.__kurio!.setScenario('wallet-rejected'))
    const rejected = await call(page, 'POST', '/wallet-sessions', { token, body: { walletId: 'w-u1-primary', network: 'ethereum' } })
    expectError(rejected.body, 'FORBIDDEN')
  })
})

test.describe('carrinho', () => {
  const cartId = 'guest-cart-0001'

  test('itens, limites, cupom e totais', async ({ page }) => {
    const add = await call<Cart>(page, 'POST', '/cart/items', { cartId, body: { nftId: 'emerald-ape-042', editionId: 'e10', quantity: 2 } })
    expect(add.status).toBe(201)
    let cart = cartSchema.parse(add.body)
    expect(cart.items[0]).toMatchObject({ id: 'emerald-ape-042:e10', quantity: 2, unitPriceEth: '0.71', lineTotalEth: '1.42' })

    cart = cartSchema.parse((await call(page, 'POST', '/cart/items', { cartId, body: { nftId: 'sage-nomad-009', editionId: 'e1', quantity: 1 } })).body)
    expect(cart.itemCount).toBe(3)

    const tooMany = await call(page, 'PATCH', '/cart/items/emerald-ape-042:e10', { cartId, body: { quantity: 8 } })
    expect(tooMany.status).toBe(409)
    expectError(tooMany.body, 'OUT_OF_STOCK') // a 1/10 tem 7 disponíveis

    const soldOut = await call(page, 'POST', '/cart/items', { cartId, body: { nftId: 'golden-signal-160', editionId: 'e1', quantity: 1 } })
    expectError(soldOut.body, 'OUT_OF_STOCK')

    for (const [code, message] of [
      ['NAOEXISTE', 'Cupom inválido'],
      ['EXPIRADO', 'Este cupom expirou'],
    ] as const) {
      const result = await call(page, 'PUT', '/cart/coupon', { cartId, body: { code } })
      expect(result.status).toBe(422)
      expect(expectError(result.body, 'VALIDATION_ERROR').fields).toEqual({ code: message })
    }

    cart = cartSchema.parse((await call(page, 'PUT', '/cart/coupon', { cartId, body: { code: 'kurio10' } })).body)
    const subtotal = addEth(mulEth('0.71', 2), '1.69')
    expect(cart).toMatchObject({
      coupon: { code: 'KURIO10', percent: 10 },
      subtotalEth: subtotal,
      discountEth: percentOf(subtotal, 10),
      estimatedNetworkFeeEth: '0.016',
      totalEth: addEth(subEth(subtotal, percentOf(subtotal, 10)), '0.016'),
    })

    cart = cartSchema.parse((await call(page, 'DELETE', '/cart/items/sage-nomad-009:e1', { cartId })).body)
    expect(cart.items).toHaveLength(1)

    // Persistência: o banco do mock sobrevive ao refresh.
    await page.reload()
    await page.waitForFunction(() => !!window.__kurio)
    cart = cartSchema.parse((await call(page, 'GET', '/cart', { cartId })).body)
    expect(cart.items).toHaveLength(1)
    expect(cart.coupon?.code).toBe('KURIO10')
  })

  test('merge do visitante no login respeita o estoque', async ({ page }) => {
    await call(page, 'POST', '/cart/items', { cartId, body: { nftId: 'emerald-ape-042', editionId: 'e1', quantity: 1 } })
    const { token } = await login(page)
    await call(page, 'POST', '/cart/items', { token, body: { nftId: 'emerald-ape-042', editionId: 'e1', quantity: 1 } })

    const merged = mergeCartResultSchema.parse((await call(page, 'POST', '/cart/merge', { token, body: { guestCartId: cartId } })).body)
    expect(merged.cart.items).toEqual([expect.objectContaining({ id: 'emerald-ape-042:e1', quantity: 1 })])
    expect(merged.adjustments).toEqual([{ itemId: 'emerald-ape-042:e1', requested: 2, applied: 1 }])

    // O carrinho do usuário não é acessível pelo id sem a sessão.
    expect((await call(page, 'GET', '/cart', { cartId: merged.cart.id })).status).toBe(403)
  })
})

test.describe('checkout e pedidos', () => {
  async function prepare(page: import('@playwright/test').Page) {
    const { token } = await login(page)
    await call(page, 'POST', '/cart/items', { token, body: { nftId: 'emerald-ape-042', editionId: 'e10', quantity: 2 } })
    await call(page, 'POST', '/cart/items', { token, body: { nftId: 'golden-beat-207', editionId: 'e50', quantity: 1 } })
    await call(page, 'POST', '/wallet-sessions', { token, body: { walletId: 'w-u1-primary', network: 'ethereum' } })
    const quote = quoteSchema.parse((await call(page, 'POST', '/quotes', { token, body: { network: 'ethereum' } })).body)
    const order = {
      quoteId: quote.quoteId,
      walletId: 'w-u1-primary',
      network: 'ethereum',
      collector: {
        displayName: 'Rafa Colecionador',
        username: 'colecionador',
        profileName: 'Rafa',
        email: 'colecionador@kurio.test',
        ensName: 'rafa.kurio.eth',
      },
    }
    return { token, quote, order }
  }

  test('pedido idempotente confirma com recibo e limpa só o que foi comprado', async ({ page }) => {
    const { token, quote, order } = await prepare(page)
    expect(quote.networkFeeEth).toBe('0.016')
    await call(page, 'POST', '/cart/items', { token, body: { nftId: 'sage-nomad-009', editionId: 'e1', quantity: 1 } })

    // O carrinho mudou depois da cotação: a cotação ficou velha e a resposta já traz a nova.
    const stale = await call(page, 'POST', '/orders', { token, body: order, headers: { 'Idempotency-Key': 'key-stale-0001' } })
    expect(stale.status).toBe(409)
    const fresh = expectError(stale.body, 'QUOTE_STALE').quote!
    expect(fresh.lines).toHaveLength(3)

    await call(page, 'DELETE', '/cart/items/sage-nomad-009:e1', { token })
    const quote2 = quoteSchema.parse((await call(page, 'POST', '/quotes', { token, body: { network: 'ethereum' } })).body)
    const body = { ...order, quoteId: quote2.quoteId }
    const headers = { 'Idempotency-Key': 'key-order-0001' }

    const first = await call<Order>(page, 'POST', '/orders', { token, body, headers })
    expect(first.status).toBe(201)
    const created = orderSchema.parse(first.body)
    expect(created).toMatchObject({ status: 'pending', receipt: null, itemCount: 3, totalEth: quote2.totalEth })

    const again = await call<Order>(page, 'POST', '/orders', { token, body, headers })
    expect(again.status).toBe(200)
    expect(orderSchema.parse(again.body).id).toBe(created.id)

    const conflict = await call(page, 'POST', '/orders', { token, body: { ...body, network: 'polygon' }, headers })
    expectError(conflict.body, 'IDEMPOTENCY_CONFLICT')

    await expect
      .poll(async () => orderSchema.parse((await call(page, 'GET', `/orders/${created.id}`, { token })).body).status)
      .toBe('confirmed')
    const confirmed = orderSchema.parse((await call(page, 'GET', `/orders/${created.id}`, { token })).body)
    expect(confirmed.receipt).toMatchObject({ totalEth: quote2.totalEth, wallet: { label: 'Principal', provider: 'metamask' } })

    // Recibo é snapshot: mudar o preço depois não muda o pedido.
    await page.evaluate(() => window.__kurio!.emitNftUpdate('emerald-ape-042', { editionId: 'e10', priceEth: '9.99' }))
    const later = orderSchema.parse((await call(page, 'GET', `/orders/${created.id}`, { token })).body)
    expect(later.receipt).toEqual(confirmed.receipt)

    const cart = cartSchema.parse((await call(page, 'GET', '/cart', { token })).body)
    expect(cart.items).toEqual([])
    const detail = nftDetailSchema.parse((await call(page, 'GET', '/nfts/emerald-ape-042')).body)
    expect(detail.editions.find((edition) => edition.id === 'e10')!.available).toBe(5)

    const other = await login(page, 'curadora@kurio.test')
    const forbidden = await call(page, 'GET', `/orders/${created.id}`, { token: other.token })
    expect(forbidden.status).toBe(403)
    expectError(forbidden.body, 'FORBIDDEN')
  })

  test('preço alterado pelo socket invalida a cotação', async ({ page }) => {
    const { token, order } = await prepare(page)
    await page.evaluate(() => window.__kurio!.emitNftUpdate('golden-beat-207', { editionId: 'e50', priceEth: '0.50' }))
    const result = await call(page, 'POST', '/orders', { token, body: order, headers: { 'Idempotency-Key': 'key-price-0001' } })
    const error = expectError(result.body, 'QUOTE_STALE')
    const quote: Quote = error.quote!
    expect(quote.lines.find((line) => line.nftId === 'golden-beat-207')!.unitPriceEth).toBe('0.5')
  })

  test('pagamento recusado mantém o carrinho', async ({ page }) => {
    await page.evaluate(() => window.__kurio!.setScenario('payment-declined'))
    const { token, order } = await prepare(page)
    const created = orderSchema.parse(
      (await call(page, 'POST', '/orders', { token, body: order, headers: { 'Idempotency-Key': 'key-decline-01' } })).body,
    )
    await expect
      .poll(async () => orderSchema.parse((await call(page, 'GET', `/orders/${created.id}`, { token })).body).status)
      .toBe('declined')
    const cart = cartSchema.parse((await call(page, 'GET', '/cart', { token })).body)
    expect(cart.itemCount).toBe(3)
  })

  test('pedido exige carteira conectada', async ({ page }) => {
    const { token, order } = await prepare(page)
    const { session } = (await call<{ session: { id: string } }>(page, 'GET', '/wallet-sessions/current', { token })).body
    await call(page, 'DELETE', `/wallet-sessions/${session.id}`, { token })
    const result = await call(page, 'POST', '/orders', { token, body: order, headers: { 'Idempotency-Key': 'key-wallet-01' } })
    expect(expectError(result.body, 'VALIDATION_ERROR').fields).toEqual({ walletId: 'Carteira desconectada' })
  })

  test('cenário price-change: o preço sobe depois da primeira cotação', async ({ page }) => {
    await page.evaluate(() => window.__kurio!.setScenario('price-change'))
    const { token, quote, order } = await prepare(page)
    const line = quote.lines[0]!
    await expect
      .poll(async () => nftDetailSchema.parse((await call(page, 'GET', `/nfts/${line.nftId}`)).body).editions.find((e) => e.id === line.editionId)!.priceEth)
      .toBe(addEth(line.unitPriceEth, percentOf(line.unitPriceEth, 15)))
    const result = await call(page, 'POST', '/orders', { token, body: order, headers: { 'Idempotency-Key': 'key-raise-0001' } })
    expectError(result.body, 'QUOTE_STALE')
  })

  test('cenário sold-out: a edição esgota ao confirmar', async ({ page }) => {
    const { token, quote, order } = await prepare(page)
    await page.evaluate(() => window.__kurio!.setScenario('sold-out'))
    const result = await call(page, 'POST', '/orders', { token, body: order, headers: { 'Idempotency-Key': 'key-soldout-01' } })
    expect(result.status).toBe(409)
    expectError(result.body, 'OUT_OF_STOCK')
    const line = quote.lines[0]!
    const detail = nftDetailSchema.parse((await call(page, 'GET', `/nfts/${line.nftId}`)).body)
    expect(detail.editions.find((edition) => edition.id === line.editionId)!.available).toBe(0)
  })

  test('cenário order-timeout: o reenvio com a mesma chave recupera o pedido', async ({ page }) => {
    const { token, order } = await prepare(page)
    await page.evaluate(() => window.__kurio!.setScenario('order-timeout'))
    const headers = { 'Idempotency-Key': 'key-timeout-01' }
    const slow = call(page, 'POST', '/orders', { token, body: order, headers }).catch(() => null) // só chega depois de 12 s
    await page.waitForTimeout(500)

    const retry = await call(page, 'POST', '/orders', { token, body: order, headers })
    expect(retry.status).toBe(200)
    const recovered = orderSchema.parse(retry.body)
    await expect
      .poll(async () => orderSchema.parse((await call(page, 'GET', `/orders/${recovered.id}`, { token })).body).status)
      .toBe('confirmed')
    void slow
  })
})

test.describe('cenários e reset', () => {
  test('empty, offline, flaky e falha forçada', async ({ page }) => {
    await page.evaluate(() => window.__kurio!.setScenario('empty'))
    expect(nftListSchema.parse((await call(page, 'GET', '/nfts')).body).total).toBe(0)
    expect(featuredSchema.parse((await call(page, 'GET', '/nfts/featured')).body).highlight).toBeNull()

    await page.evaluate(() => window.__kurio!.setScenario('offline'))
    await expect(call(page, 'GET', '/nfts')).rejects.toThrow(/Failed to fetch/)

    await page.evaluate(() => window.__kurio!.setScenario('flaky', 7))
    const statuses: number[] = []
    for (let i = 0; i < 20; i++) statuses.push((await call(page, 'GET', '/nfts')).status)
    expect(statuses).toContain(503)
    expect(statuses).toContain(200)

    // Mesma seed, mesma sequência.
    await page.evaluate(() => window.__kurio!.setScenario('flaky', 7))
    const again: number[] = []
    for (let i = 0; i < 20; i++) again.push((await call(page, 'GET', '/nfts')).status)
    expect(again).toEqual(statuses)

    await page.evaluate(() => {
      window.__kurio!.setScenario('default')
      window.__kurio!.failNext('PUT', '^/api/me/favorites/')
    })
    const { token } = await login(page)
    const failed = await call(page, 'PUT', '/me/favorites/emerald-ape-042', { token })
    expect(failed.status).toBe(503)
    expect(failed.headers['retry-after']).toBe('1')
    expect((await call(page, 'PUT', '/me/favorites/emerald-ape-042', { token })).status).toBe(200)
  })

  test('session-expired encurta a sessão e out-of-order inverte as buscas', async ({ page }) => {
    await page.evaluate(() => window.__kurio!.setScenario('session-expired'))
    const session = sessionSchema.parse((await call(page, 'POST', '/auth/login', {
      body: { email: 'colecionador@kurio.test', password: PASSWORD },
    })).body)
    expect(Date.parse(session.expiresAt) - Date.now()).toBeLessThanOrEqual(30_000)

    await page.evaluate(() => {
      window.__kurio!.setScenario('out-of-order')
      window.__kurio!.setLatency(null)
    })
    const order = await page.evaluate(async () => {
      const arrived: string[] = []
      await Promise.all(['a', 'ape'].map((q) => fetch(`/api/nfts?q=${q}`).then(() => arrived.push(q))))
      return arrived
    })
    expect(order).toEqual(['ape', 'a'])
  })

  test('cenário pela URL e reset restaura a seed', async ({ page }) => {
    await page.goto('/?scenario=empty')
    await page.waitForFunction(() => window.__kurio?.getScenario() === 'empty')

    await page.evaluate(() => window.__kurio!.setScenario('default'))
    const { token } = await login(page)
    await call(page, 'DELETE', '/me/favorites/sage-nomad-009', { token })
    await page.evaluate(() => window.__kurio!.emitNftUpdate('emerald-ape-042', { priceEth: '5.00' }))

    await page.evaluate(() => window.__kurio!.reset())
    const detail = nftDetailSchema.parse((await call(page, 'GET', '/nfts/emerald-ape-042')).body)
    expect(detail).toMatchObject({ priceEth: '1.19', version: 1 })
    // As sessões também voltam à seed (nenhuma): o token antigo deixa de valer.
    expect((await call(page, 'GET', '/me/favorites', { token })).status).toBe(401)
    const fresh = await login(page)
    const favorites = favoritesSchema.parse((await call(page, 'GET', '/me/favorites', { token: fresh.token })).body)
    expect(favorites.items).toHaveLength(2)
  })
})
