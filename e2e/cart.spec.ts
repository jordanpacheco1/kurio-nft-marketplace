import { expect, test, type Page } from '@playwright/test'
import { bootMocks, call, eth, guestCartId, login, seedCart, signIn } from './support/api'

// Cenário 5 do enunciado: carrinho, quantidades, remoção, cupom e persistência após refresh/login.
// Mais o aviso de preço e estoque em tempo real com o carrinho aberto.

type CartBody = { subtotalEth: string; discountEth: string; totalEth: string; items: { id: string; unitPriceEth: string }[] }

const summary = (page: Page) => page.getByTestId('cart-summary')
const quantity = (page: Page, item: string) => page.getByRole('group', { name: `Quantidade de ${item}` }).getByRole('status')

async function apiCart(page: Page, cartId: string) {
  return (await call<CartBody>(page, 'GET', '/cart', { cartId })).body
}

/** O resumo mostra exatamente os valores que a API calculou. */
async function expectSummaryMatchesApi(page: Page, cartId: string) {
  const cart = await apiCart(page, cartId)
  await expect(summary(page)).toContainText(`Subtotal${eth(cart.subtotalEth)}`)
  await expect(summary(page)).toContainText(`(-) ${eth(cart.discountEth)}`)
  await expect(summary(page)).toContainText(`Total${eth(cart.totalEth)}`)
}

test('quantidades, limite, remoção, cupom e persistência após refresh', async ({ page }) => {
  await bootMocks(page, '/?devtools=off')
  const cartId = await guestCartId(page)
  await seedCart(
    page,
    [
      { nftId: 'emerald-ape-042', editionId: 'e10', quantity: 5 }, // 7 disponíveis
      { nftId: 'emerald-ape-042', editionId: 'open', quantity: 1 },
    ],
    { cartId },
  )
  await page.goto('/carrinho?devtools=off')
  await expect(page.getByTestId('cart-line')).toHaveCount(2)
  await expectSummaryMatchesApi(page, cartId)

  // Aumentar até o estoque da edição
  const plus = page.getByRole('button', { name: 'Aumentar quantidade de Emerald Ape #042 (1/10)' })
  await plus.click()
  await expect(quantity(page, 'Emerald Ape #042 (1/10)')).toHaveText('6')
  await plus.click()
  await expect(quantity(page, 'Emerald Ape #042 (1/10)')).toHaveText('7')
  await expect(plus).toBeDisabled()
  await expectSummaryMatchesApi(page, cartId)

  // Remover
  await page.getByRole('button', { name: 'Remover Emerald Ape #042 (Aberta)' }).click()
  await expect(page.getByTestId('cart-line')).toHaveCount(1)
  await expect(page.getByTestId('live-region')).toHaveText('Emerald Ape #042 removido do carrinho')
  await expectSummaryMatchesApi(page, cartId)

  // Cupom: inválido, expirado e válido (regras fixas do mock)
  const coupon = page.getByLabel('Código promocional')
  const apply = page.getByRole('button', { name: 'Aplicar' })
  await coupon.fill('NAOEXISTE')
  await apply.click()
  await expect(coupon).toHaveAccessibleDescription('Cupom inválido')
  await coupon.fill('EXPIRADO')
  await apply.click()
  await expect(coupon).toHaveAccessibleDescription('Este cupom expirou')
  await coupon.fill('kurio10')
  await apply.click()
  await expect(page.getByTestId('applied-coupon')).toContainText('KURIO10')
  await expect(summary(page)).toContainText('Desconto (KURIO10)')
  await expectSummaryMatchesApi(page, cartId)

  // Refresh: itens, quantidades e cupom continuam
  await page.reload()
  await expect(page.getByTestId('cart-line')).toHaveCount(1)
  await expect(quantity(page, 'Emerald Ape #042 (1/10)')).toHaveText('7')
  await expect(page.getByTestId('applied-coupon')).toContainText('KURIO10')

  await page.getByRole('button', { name: 'Remover cupom' }).click()
  await expect(page.getByLabel('Código promocional')).toBeVisible()
  await expectSummaryMatchesApi(page, cartId)
})

test('itens do visitante são preservados ao entrar na conta', async ({ page }) => {
  await bootMocks(page, '/?devtools=off')
  const cartId = await guestCartId(page)
  await seedCart(page, [{ nftId: 'emerald-ape-042', editionId: 'e50', quantity: 2 }], { cartId })
  // A conta já tinha outro item no carrinho
  const { token } = await login(page)
  await seedCart(page, [{ nftId: 'emerald-ape-042', editionId: 'open', quantity: 1 }], { token })

  await page.goto('/carrinho?devtools=off')
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL('/login?redirect=%2Fcheckout')
  await signIn(page)
  await expect(page).toHaveURL('/checkout')

  await page.goto('/carrinho?devtools=off')
  await expect(page.getByTestId('cart-line')).toHaveCount(2)
  await expect(quantity(page, 'Emerald Ape #042 (1/50)')).toHaveText('2')
  await expect(quantity(page, 'Emerald Ape #042 (Aberta)')).toHaveText('1')
})

test('preço e estoque mudam em tempo real com o carrinho aberto', async ({ page }) => {
  await bootMocks(page, '/?devtools=off')
  const cartId = await guestCartId(page)
  await seedCart(page, [{ nftId: 'emerald-ape-042', editionId: 'e10', quantity: 3 }], { cartId })
  const before = (await apiCart(page, cartId)).items[0]!.unitPriceEth

  await page.goto('/carrinho?devtools=off')
  await expect(page.getByTestId('cart-line')).toHaveCount(1)
  await page.waitForFunction(() => (window.__kurio?.connectedClients() ?? 0) > 0)

  // Preço: aviso com valor antigo e novo, e o resumo recalculado pela API
  await page.evaluate(() => window.__kurio!.emitNftUpdate('emerald-ape-042', { editionId: 'e10', priceEth: '1.5' }))
  const priceNotice = `O preço de Emerald Ape #042 (1/10) mudou de ${eth(before)} para 1.50 ETH.`
  await expect(page.getByTestId('cart-notice').filter({ hasText: priceNotice })).toBeVisible()
  await expect(page.getByTestId('live-region')).toHaveText(priceNotice)
  await expect(summary(page)).toContainText('Subtotal4.50 ETH')

  // Estoque abaixo da quantidade: avisa e bloqueia a finalização até ajustar
  await page.evaluate(() => window.__kurio!.emitNftUpdate('emerald-ape-042', { editionId: 'e10', available: 2 }))
  await expect(page.getByTestId('cart-notice').filter({ hasText: 'Só restam 2 unidades de Emerald Ape #042 (1/10)' })).toBeVisible()
  const finish = page.getByRole('button', { name: 'Conectar e finalizar' })
  await expect(finish).toBeDisabled()
  await expect(page.getByTestId('cart-line')).toContainText('Só restam 2')

  await page.getByRole('button', { name: 'Diminuir quantidade de Emerald Ape #042 (1/10)' }).click()
  await expect(quantity(page, 'Emerald Ape #042 (1/10)')).toHaveText('2')
  await expect(finish).toBeEnabled()

  await page.getByTestId('cart-notice').first().getByRole('button', { name: 'Dispensar' }).click()
  await expect(page.getByTestId('cart-notice')).toHaveCount(1)
})
