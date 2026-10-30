import { expect, test, type Page } from '@playwright/test'
import { bootMocks, guestCartId, login, seedCart } from './support/api'

// Regressão visual de início, detalhe, carrinho e pagamento (desktop e mobile).
// Dados estáveis: banco da seed padrão (2026), latência zero, relógio fixo, sem animações.
// As baselines são geradas no Linux (imagem oficial do Playwright, via `npm run test:visual:update`);
// fora do Linux a renderização de fontes muda e o teste é pulado. Ver README.

test.skip(process.platform !== 'linux' && !process.env.VISUAL, 'Baselines geradas no Linux (Docker): npm run test:visual')
test.use({ reducedMotion: 'reduce' })

// O carrinho dos screenshots das fases 4 e 5 (edição Aberta)
const CART = [
  { nftId: 'emerald-ape-042', editionId: 'open', quantity: 2 },
  { nftId: 'violet-nomad-314', editionId: 'open', quantity: 6 },
  { nftId: 'ivory-baron-088', editionId: 'open', quantity: 9 },
]

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-30T15:00:00-03:00'))
})

/** Carrega todas as imagens (inclusive as `lazy` abaixo da dobra) e espera as fontes. */
async function settle(page: Page) {
  await page.evaluate(async () => {
    const images = [...document.images]
    images.forEach((image) => (image.loading = 'eager'))
    await Promise.all(images.map((image) => image.decode().catch(() => undefined)))
    await document.fonts.ready
  })
  await expect(page.locator('[aria-busy="true"], .skeleton')).toHaveCount(0)
}

async function snap(page: Page, name: string) {
  await settle(page)
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, animations: 'disabled', caret: 'hide' })
}

test('início', async ({ page }) => {
  await bootMocks(page, '/?devtools=off')
  await expect(page.getByRole('link', { name: 'Emerald Ape #042' }).first()).toBeVisible()
  await snap(page, 'inicio')
})

test('detalhe', async ({ page }) => {
  await bootMocks(page, '/nft/emerald-ape-042?devtools=off')
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042', level: 1 })).toBeVisible()
  await snap(page, 'detalhe')
})

test('carrinho', async ({ page }) => {
  await bootMocks(page, '/?devtools=off')
  await seedCart(page, CART, { cartId: await guestCartId(page) })
  await page.goto('/carrinho?devtools=off')
  await expect(page.getByRole('button', { name: /^Remover Ivory Baron #088/ })).toBeVisible()
  await snap(page, 'carrinho')
})

test('pagamento', async ({ page }) => {
  await bootMocks(page, '/?devtools=off')
  const { token } = await login(page)
  await seedCart(page, CART, { token })
  await page.evaluate((value) => localStorage.setItem('kurio.token', value), token)
  await page.goto('/checkout?devtools=off')
  await expect(page.getByTestId('quote-summary').or(page.getByTestId('mobile-total'))).toContainText('ETH')
  await snap(page, 'pagamento')
})
