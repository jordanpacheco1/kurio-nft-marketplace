import { expect, test } from '@playwright/test'

test('a home carrega o catálogo vindo do mock', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('nft-card')).toHaveCount(9)
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
})

test('rota inexistente mostra a 404 e volta ao início', async ({ page }) => {
  await page.goto('/rota-que-nao-existe')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao início' }).click()
  await expect(page).toHaveURL('/')
})

test('nft.updated emitido pelo socket mockado chega na interface', async ({ page }) => {
  await page.goto('/')
  const card = page.getByTestId('nft-card').filter({ hasText: 'Emerald Ape #042' })
  await expect(card.getByTestId('nft-price')).toHaveText('1.19 ETH')

  // Espera o socket.io-client conectar ao servidor simulado antes de emitir.
  await page.waitForFunction(() => (window.__kurio?.connectedClients() ?? 0) > 0)
  await page.evaluate(() => window.__kurio!.emitNftUpdate('emerald-ape-042', { priceEth: '2.50' }))

  await expect(card.getByTestId('nft-price')).toHaveText('2.50 ETH')
  await expect(page.getByTestId('live-region')).toHaveText('Emerald Ape #042 agora custa 2.50 ETH')
})
