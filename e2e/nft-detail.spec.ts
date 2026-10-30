import { expect, test } from '@playwright/test'
import { bootMocks, login } from './support/api'

// Cenário 2 do enunciado (acesso direto e recurso inexistente), mais edições, carrinho, favoritos e tempo real no detalhe.

test('acesso direto ao detalhe', async ({ page }) => {
  await bootMocks(page, '/nft/emerald-ape-042?devtools=off')
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  await expect(page.getByRole('radio', { name: '1/1', exact: true })).toBeChecked()
  await expect(page.getByText('Mais desta coleção')).toBeVisible()
})

test('NFT inexistente mostra a tela própria', async ({ page }) => {
  await bootMocks(page, '/nft/nao-existe?devtools=off')
  await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
  await page.getByRole('link', { name: 'Explorar o catálogo' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByTestId('nft-card')).toHaveCount(9)
})

test('do catálogo ao detalhe pelo card', async ({ page }) => {
  await bootMocks(page, '/?devtools=off')
  await page.getByRole('link', { name: 'Sage Nomad #009' }).first().click()
  await expect(page).toHaveURL(/\/nft\/sage-nomad-009/)
  await expect(page.getByRole('heading', { level: 1, name: 'Sage Nomad #009' })).toBeVisible()
})

test('edição esgotada bloqueia a compra', async ({ page }) => {
  await bootMocks(page, '/nft/golden-signal-160?edition=e1&devtools=off')
  await expect(page.getByRole('status').filter({ hasText: 'A edição 1/1 está esgotada' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Comprar/ })).toBeDisabled()

  await page.getByText('1/10', { exact: true }).click()
  await expect(page).toHaveURL(/edition=e10/)
  await expect(page.getByRole('button', { name: /Comprar/ })).toBeEnabled()
})

test('quantidade respeita o estoque da edição e compra leva ao carrinho', async ({ page }) => {
  await bootMocks(page, '/nft/emerald-ape-042?devtools=off')
  await page.getByText('1/10', { exact: true }).click() // 7 disponíveis
  const plus = page.getByRole('button', { name: 'Aumentar quantidade' })
  for (let i = 0; i < 6; i++) await plus.click()
  await expect(page.getByRole('group', { name: 'Quantidade' }).getByRole('status')).toHaveText('7')
  await expect(plus).toBeDisabled()

  await page.getByRole('button', { name: /Comprar/ }).click()
  await expect(page).toHaveURL('/carrinho')
  await expect(page.getByRole('link', { name: 'Carrinho, 7 itens' })).toBeVisible()
})

test('visitante que favorita vai para o login e volta para o NFT', async ({ page, isMobile }) => {
  await bootMocks(page, '/nft/emerald-ape-042?devtools=off')
  const favorite = isMobile
    ? page.getByRole('button', { name: 'Favoritar Emerald Ape #042' })
    : page.getByRole('button', { name: 'Favoritar', exact: true })
  await favorite.click()
  await expect(page).toHaveURL(/\/login\?redirect=%2Fnft%2Femerald-ape-042/)
})

test('favoritar é otimista e volta atrás quando a API falha', async ({ page }) => {
  await bootMocks(page, '/?devtools=off')
  const { token } = await login(page)
  await page.evaluate((value) => localStorage.setItem('kurio.token', value), token)
  await page.reload()
  await page.waitForFunction(() => !!window.__kurio)
  await page.evaluate(() => window.__kurio!.setLatency(400))

  const card = page.getByTestId('nft-card').filter({ hasText: 'Golden Beat #207' })
  const heart = card.getByRole('button', { name: 'Favoritar Golden Beat #207' }).locator('visible=true')
  await card.hover()
  await expect(heart).toHaveAttribute('aria-pressed', 'false')

  // Sucesso: muda na hora e continua marcado depois da resposta
  await heart.click()
  await expect(heart).toHaveAttribute('aria-pressed', 'true', { timeout: 300 })
  await expect(page.getByTestId('live-region')).toHaveText('Golden Beat #207 adicionado aos favoritos')

  // Falha: marca na hora e volta ao estado anterior com aviso
  await page.evaluate(() => window.__kurio!.failNext('DELETE', '^/api/me/favorites/'))
  await heart.click()
  await expect(heart).toHaveAttribute('aria-pressed', 'false', { timeout: 300 })
  await expect(heart).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('live-region')).toHaveText('Não foi possível atualizar os favoritos de Golden Beat #207. Tente de novo.')
  await expect(page.getByRole('region', { name: /Notifications/ })).toContainText('Não foi possível atualizar')
})

test('nft.updated atualiza o preço e o estoque no detalhe', async ({ page }) => {
  await bootMocks(page, '/nft/emerald-ape-042?devtools=off')
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  await page.waitForFunction(() => (window.__kurio?.connectedClients() ?? 0) > 0)

  await page.evaluate(() => window.__kurio!.emitNftUpdate('emerald-ape-042', { editionId: 'e1', priceEth: '2.00' }))
  await expect(page.getByTestId('live-region')).toHaveText('Emerald Ape #042 agora custa 2.00 ETH')
  await expect(page.getByText('2.00 ETH').locator('visible=true').first()).toBeVisible()

  await page.evaluate(() => window.__kurio!.emitNftUpdate('emerald-ape-042', { editionId: 'e1', available: 0 }))
  await expect(page.getByRole('status').filter({ hasText: 'A edição 1/1 está esgotada' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Comprar/ })).toBeDisabled()
})
