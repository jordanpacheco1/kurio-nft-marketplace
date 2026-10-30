import { expect, test, type Page } from '@playwright/test'
import { bootMocks, call, login, seedCart, signIn } from './support/api'

// Cenários 6, 7, 9 e 10 do enunciado: compra completa até o recibo, recusa, duplo clique e timeout
// recuperando o mesmo pedido, preço/estoque mudando pelo Socket.IO durante o checkout, eventos
// duplicados ou antigos, queda do socket e retomada do pedido pendente.

type Line = { nftId: string; editionId: string; quantity: number }
type NftBody = { editions: { id: string; available: number; priceEth: string }[] }

const EMERALD_E10: Line = { nftId: 'emerald-ape-042', editionId: 'e10', quantity: 2 }

async function stock(page: Page, nftId: string, editionId: string) {
  const { body } = await call<NftBody>(page, 'GET', `/nfts/${nftId}`)
  return body.editions.find((edition) => edition.id === editionId)!.available
}

/** Usuário logado com itens no carrinho, direto no checkout. */
async function openCheckout(page: Page, { lines = [EMERALD_E10], scenario }: { lines?: Line[]; scenario?: string } = {}) {
  await bootMocks(page, '/?devtools=off')
  if (scenario) await page.evaluate((id) => window.__kurio!.setScenario(id), scenario)
  const { token } = await login(page)
  await seedCart(page, lines, { token })
  await page.evaluate((value) => localStorage.setItem('kurio.token', value), token)
  await page.goto('/checkout?devtools=off')
  // Espera a primeira cotação (o total só aparece com ela), para os eventos chegarem depois
  await expect(page.getByTestId('quote-summary').or(page.getByTestId('mobile-total'))).toContainText('ETH')
}

async function waitSocket(page: Page) {
  await page.waitForFunction(() => (window.__kurio?.connectedClients() ?? 0) > 0)
}

/** Conecta a carteira escolhida e passa para a revisão. */
async function connectAndReview(page: Page) {
  await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
  await expect(page.getByTestId('wallet-connection')).toContainText('Principal conectada via MetaMask')
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Revise sua compra' })).toBeFocused()
}

const payButton = (page: Page) => page.getByRole('button', { name: /^Pagar / })

test('compra completa: do catálogo ao recibo confirmado', async ({ page }) => {
  await bootMocks(page, '/?devtools=off')
  await page.getByRole('link', { name: 'Sage Nomad #009' }).first().click()
  await expect(page).toHaveURL(/\/nft\/sage-nomad-009/)
  await page.getByRole('button', { name: /Comprar/ }).click()
  await expect(page).toHaveURL('/carrinho')
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await signIn(page)
  await expect(page).toHaveURL('/checkout')

  // Os dados do colecionador vêm do perfil (no desktop, num formulário editável)
  await connectAndReview(page)
  await expect(page.getByText('rafa.kurio.eth')).toBeVisible()
  await expect(page.getByTestId('quote-line')).toContainText('Sage Nomad #009')
  await expect(payButton(page)).toBeEnabled()
  const total = (await payButton(page).textContent())!.replace('Pagar ', '')
  const token = (await page.evaluate(() => localStorage.getItem('kurio.token')))!
  const { editionId } = (await call<{ items: Line[] }>(page, 'GET', '/cart', { token })).body.items[0]!
  const before = await stock(page, 'sage-nomad-009', editionId)

  await payButton(page).click()
  await expect(page).toHaveURL(/\/pedidos\/ord-/)
  await expect(page.getByRole('heading', { name: 'Processando pagamento' })).toBeVisible()

  // order.updated (socket) leva ao recibo
  const receipt = page.getByTestId('receipt')
  await expect(receipt).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
  await expect(page.getByTestId('receipt-line')).toContainText('Sage Nomad #009')
  await expect(receipt).toContainText(`Total${total}`)
  await expect(page.getByRole('link', { name: /Ver no Etherscan/ })).toHaveAttribute('href', /^https:\/\/etherscan\.io\/tx\/0x[0-9a-f]{64}$/)
  expect(await stock(page, 'sage-nomad-009', editionId)).toBe(before - 1)

  // O recibo é um snapshot: mudar o preço depois não o altera
  const orderUrl = page.url()
  await page.evaluate((id) => window.__kurio!.emitNftUpdate('sage-nomad-009', { editionId: id, priceEth: '9.99' }), editionId)
  await page.goto(orderUrl)
  await expect(page.getByTestId('receipt')).toContainText(`Total${total}`)

  // O carrinho perdeu o item comprado; fechar o recibo volta ao início
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL('/')
  await page.goto('/carrinho?devtools=off')
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
})

test('dados do colecionador inválidos travam a compra', async ({ page, isMobile }) => {
  test.skip(isMobile, 'O formulário existe só no desktop; no mobile, o sheet cobre o mesmo caso (teste abaixo)')
  await openCheckout(page)
  const form = page.getByRole('form', { name: 'Perfil do colecionador' })
  await form.getByLabel('E-mail').fill('sem-arroba')
  await form.getByLabel('Nome ENS').fill('')
  await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(form.getByLabel('E-mail')).toBeFocused()
  await expect(form.getByLabel('E-mail')).toHaveAccessibleDescription('E-mail inválido')
  await expect(form.getByLabel('Nome ENS')).toHaveAttribute('aria-invalid', 'true')

  // O rascunho sobrevive à sessão expirada e volta depois do login
  await form.getByLabel('E-mail').fill('rafa@kurio.test')
  await form.getByLabel('Nome ENS').fill('rafa.colecao')
  await page.evaluate(() => window.__kurio!.expireSession())
  await page.getByRole('combobox', { name: 'Rede' }).selectOption('polygon')
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout.*&reason=expired/)
  await signIn(page)
  await expect(page).toHaveURL(/\/checkout/)
  await expect(form.getByLabel('E-mail')).toHaveValue('rafa@kurio.test')
  await expect(form.getByLabel('Nome ENS')).toHaveValue('rafa.colecao')
  await expect(page.getByRole('combobox', { name: 'Rede' })).toHaveValue('polygon')
})

test('perfil sem ENS: o mobile pede só o que falta', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Fluxo do pagamento mobile')
  await bootMocks(page, '/?devtools=off')
  const { token } = await login(page)
  await seedCart(page, [EMERALD_E10], { token })
  await call(page, 'PATCH', '/me/profile', { token, body: { ensName: null } })
  await page.evaluate((value) => localStorage.setItem('kurio.token', value), token)
  await page.goto('/checkout?devtools=off')

  await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  const sheet = page.getByRole('dialog', { name: 'Complete seus dados' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('textbox')).toHaveCount(1)
  await sheet.getByLabel(/Nome ENS/).fill('rafa.eth')
  await sheet.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Revise sua compra' })).toBeVisible()
  await expect(page.getByText('rafa.eth')).toBeVisible()
})

test('carteira: conexão recusada, aprovada e desconectada', async ({ page }) => {
  await openCheckout(page, { scenario: 'wallet-rejected' })
  await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
  await expect(page.getByTestId('wallet-error')).toContainText('A conexão foi recusada')
  // Sem carteira conectada não há revisão
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByTestId('wallet-error')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Revise sua compra' })).toHaveCount(0)

  await page.evaluate(() => window.__kurio!.setScenario('default'))
  await page.getByRole('radio', { name: /Reserva/ }).check()
  await page.getByRole('button', { name: 'Conectar Coinbase Wallet' }).click()
  await expect(page.getByTestId('wallet-connection')).toContainText('Reserva conectada via Coinbase Wallet')
  // A rede acompanha a carteira e a cotação muda de taxa
  await expect(page.getByTestId('quote-summary').or(page.getByTestId('mobile-total'))).toBeVisible()
  await page.getByRole('button', { name: 'Desconectar' }).click()
  await expect(page.getByRole('button', { name: 'Conectar Coinbase Wallet' })).toBeVisible()
})

test('pagamento recusado mantém o carrinho e a nova tentativa confirma', async ({ page }) => {
  await openCheckout(page, { scenario: 'payment-declined' })
  const before = await stock(page, 'emerald-ape-042', 'e10')
  await connectAndReview(page)
  await payButton(page).click()
  await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText('O pagamento foi recusado pela carteira.')
  expect(await stock(page, 'emerald-ape-042', 'e10')).toBe(before)

  await page.getByRole('link', { name: 'Ir para o carrinho' }).click()
  await expect(page.getByTestId('cart-line')).toHaveCount(1)
  await expect(page.getByRole('group', { name: 'Quantidade de Emerald Ape #042 (1/10)' }).getByRole('status')).toHaveText('2')

  await page.evaluate(() => window.__kurio!.setScenario('default'))
  await page.goto('/checkout?devtools=off')
  // A carteira continua conectada; a cotação consumida foi trocada por outra (chave nova)
  await expect(page.getByTestId('wallet-connection')).toContainText('Principal conectada')
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await payButton(page).click()
  await expect(page.getByTestId('receipt')).toBeVisible()
  expect(await stock(page, 'emerald-ape-042', 'e10')).toBe(before - 2)
})

test('duplo clique e timeout recuperam o mesmo pedido', async ({ page }) => {
  await page.clock.install()
  const keys: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/orders')) keys.push(request.headers()['idempotency-key']!)
  })

  await openCheckout(page, { scenario: 'order-timeout' })
  const before = await stock(page, 'emerald-ape-042', 'e10')
  await connectAndReview(page)
  await payButton(page).dblclick()
  await expect(page.getByRole('button', { name: 'Enviando pedido…' })).toBeDisabled()

  // A primeira resposta demora 12 s; o cliente desiste em 10 s e reenvia com a mesma chave
  await page.clock.fastForward(10_500)
  await expect(page).toHaveURL(/\/pedidos\/ord-/)
  await page.clock.fastForward(3_000)
  await expect(page.getByTestId('receipt')).toBeVisible()

  expect(keys.length).toBeGreaterThanOrEqual(2)
  expect(new Set(keys).size).toBe(1)
  expect(await stock(page, 'emerald-ape-042', 'e10')).toBe(before - 2) // uma compra só
})

test('preço e estoque mudam pelo socket durante o checkout', async ({ page }) => {
  await openCheckout(page)
  await waitSocket(page)
  const confirm = page.getByRole('button', { name: 'Confirmar compra' })

  // No formulário: aviso com o que mudou, compra travada até aceitar
  await page.evaluate(() => window.__kurio!.emitNftUpdate('emerald-ape-042', { editionId: 'e10', priceEth: '1.5' }))
  const changes = page.getByTestId('quote-changes')
  await expect(changes).toContainText('Emerald Ape #042 (1/10) mudou de')
  await expect(changes).toContainText('para 1.50 ETH')
  await expect(page.getByTestId('live-region')).toContainText('Os valores da compra mudaram')
  await expect(confirm).toBeDisabled()
  await page.getByRole('button', { name: 'Aceitar novos valores' }).click()
  await expect(changes).toHaveCount(0)

  // Na revisão: a cotação desatualizada não pode ser confirmada
  await connectAndReview(page)
  await page.evaluate(() => window.__kurio!.emitNftUpdate('emerald-ape-042', { editionId: 'e10', priceEth: '1.6' }))
  await expect(changes).toContainText('de 1.50 ETH para 1.60 ETH')
  await expect(payButton(page)).toBeDisabled()
  await page.getByRole('button', { name: 'Aceitar novos valores' }).click()
  await payButton(page).click()
  await expect(page.getByTestId('receipt-line')).toContainText('3.20 ETH')
})

test('estoque esgota durante o checkout', async ({ page }) => {
  await openCheckout(page)
  await waitSocket(page)
  await page.evaluate(() => window.__kurio!.emitNftUpdate('emerald-ape-042', { editionId: 'e10', available: 1 }))
  await expect(page.getByTestId('quote-error')).toContainText('Só restam 1 unidades')
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
  await expect(page.getByRole('link', { name: 'Ajustar o carrinho' })).toBeVisible()
})

test('edição esgota na hora de pagar (cenário sold-out)', async ({ page }) => {
  await openCheckout(page, { scenario: 'sold-out' })
  await connectAndReview(page)
  await payButton(page).click()
  await expect(page.getByTestId('order-error')).toContainText('não tem mais unidades suficientes')
  await expect(page.getByTestId('quote-error')).toContainText('esgotou')
  await expect(page).toHaveURL(/\/checkout/)
})

test('eventos duplicados ou antigos não regridem o preço', async ({ page }) => {
  await bootMocks(page, '/nft/emerald-ape-042?devtools=off')
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  await waitSocket(page)
  await page.evaluate(() => window.__kurio!.emitDuplicates('emerald-ape-042', { priceEth: '7.77' }))
  await expect(page.getByTestId('live-region')).toHaveText('Emerald Ape #042 agora custa 7.77 ETH')
  const price = page.getByTestId('detail-price').first()
  await expect(price).toHaveText('7.77 ETH')
  // A cópia antiga chegou por último e foi ignorada: o preço novo continua
  await page.waitForTimeout(300)
  await expect(price).toHaveText('7.77 ETH')
})

test('queda do socket com o pedido pendente: reconcilia sem criar outra compra', async ({ page }) => {
  await openCheckout(page)
  const before = await stock(page, 'emerald-ape-042', 'e10')
  await connectAndReview(page)
  await waitSocket(page)
  // O socket cai e fica fora enquanto o pagamento é processado (o order.updated se perde)
  await page.evaluate(() => window.__kurio!.dropSocket(4000))
  await payButton(page).click()
  await expect(page.getByRole('heading', { name: 'Processando pagamento' })).toBeVisible()
  expect(await page.evaluate(() => window.__kurio!.connectedClients())).toBe(0)
  // Ao reconectar, o pedido pendente é buscado no REST
  await expect(page.getByTestId('receipt')).toBeVisible({ timeout: 15_000 })
  expect(await stock(page, 'emerald-ape-042', 'e10')).toBe(before - 2)
})

test('refresh com o pedido pendente: retoma o mesmo pedido', async ({ page }) => {
  await openCheckout(page)
  const before = await stock(page, 'emerald-ape-042', 'e10')
  await connectAndReview(page)
  await payButton(page).click()
  await expect(page).toHaveURL(/\/pedidos\/ord-/)
  const orderUrl = new URL(page.url()).pathname

  // Sai da tela no meio do processamento: o app retoma pelo kurio.pendingOrder e avisa
  await page.goto('/?devtools=off')
  await page.getByRole('button', { name: 'Ver recibo' }).click()
  await expect(page).toHaveURL(orderUrl)
  await expect(page.getByTestId('receipt')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('kurio.pendingOrder'))).toBeNull()
  expect(await stock(page, 'emerald-ape-042', 'e10')).toBe(before - 2)

  // O checkout seguinte não tem pedido em andamento nem itens
  await page.goto('/checkout?devtools=off')
  await expect(page.getByTestId('quote-error')).toContainText('Seu carrinho está vazio')
})
