import { expect, test, type Page } from '@playwright/test'
import { bootMocks, call } from './support/api'

// Cenários 1 e 12 do enunciado: busca, filtros, ordenação, paginação e histórico; skeletons, falha e nova tentativa.

type ListBody = { items: { name: string }[]; total: number; totalPages: number }

/** Nomes que a API devolve para os mesmos params: a tela tem de mostrar exatamente esses, na ordem. */
async function expectedNames(page: Page, query: string) {
  const { body } = await call<ListBody>(page, 'GET', `/nfts?${query}&pageSize=9`)
  return body.items.map((item) => item.name)
}

const cardNames = (page: Page) => page.getByTestId('nft-card').getByRole('heading')

async function withFilters(page: Page, isMobile: boolean, action: () => Promise<void>) {
  if (isMobile) await page.getByRole('button', { name: /^Filtros/ }).click()
  await action()
  if (isMobile) await page.getByRole('button', { name: /^Ver .*resultados/ }).click()
}

test('busca, filtros combinados, ordenação, paginação e restauração pelo histórico', async ({ page, isMobile }) => {
  await bootMocks(page, '/?devtools=off')
  await expect(page.getByTestId('nft-card')).toHaveCount(9)

  // Filtro de rede + ordenação por preço
  await withFilters(page, isMobile, async () => {
    await page.getByRole('checkbox', { name: /^Ethereum/ }).check()
    await page.getByRole('combobox', { name: /Ordenar por/ }).selectOption('price-asc')
  })
  await expect(page).toHaveURL(/networks=.*ethereum/)
  await expect(page).toHaveURL(/sort=price-asc/)
  await expect(cardNames(page)).toHaveText(await expectedNames(page, 'networks=ethereum&sort=price-asc&page=1'))

  // Paginação
  await page.getByRole('link', { name: 'Página 2' }).click()
  await expect(page).toHaveURL(/page=2/)
  const page2 = await expectedNames(page, 'networks=ethereum&sort=price-asc&page=2')
  await expect(cardNames(page)).toHaveText(page2)

  // Busca combinada com os filtros: volta para a página 1
  if (!isMobile) await page.getByRole('button', { name: 'Abrir busca' }).click()
  await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('ape')
  await expect(page).toHaveURL(/q=ape/)
  await expect(page).not.toHaveURL(/page=/)
  await expect(cardNames(page)).toHaveText(await expectedNames(page, 'q=ape&networks=ethereum&sort=price-asc&page=1'))

  // Histórico: volta para a página 2 sem busca, depois para a página 1
  await page.goBack()
  await expect(page).toHaveURL(/page=2/)
  await expect(page).not.toHaveURL(/q=/)
  await expect(cardNames(page)).toHaveText(page2)
  await expect(page.getByRole('searchbox', { name: 'Buscar NFTs' })).toHaveValue('')
  await page.goBack()
  await expect(page).not.toHaveURL(/page=/)
  await expect(cardNames(page)).toHaveText(await expectedNames(page, 'networks=ethereum&sort=price-asc&page=1'))

  // O estado vem da URL: recarregar mantém filtros e ordenação
  await page.reload()
  await expect(cardNames(page)).toHaveText(await expectedNames(page, 'networks=ethereum&sort=price-asc&page=1'))
  if (isMobile) await page.getByRole('button', { name: /^Filtros/ }).click()
  await expect(page.getByRole('checkbox', { name: /^Ethereum/ })).toBeChecked()
})

test('busca sem resultado mostra o estado vazio e limpa os filtros', async ({ page, isMobile }) => {
  await bootMocks(page, '/?devtools=off&q=nada-com-isso')
  await expect(page.getByText('Nenhum NFT encontrado.')).toBeVisible()
  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(page.getByTestId('nft-card')).toHaveCount(9)
  if (isMobile) await expect(page.getByRole('searchbox', { name: 'Buscar NFTs' })).toHaveValue('')
})

test('skeletons durante carregamento lento', async ({ page }) => {
  await page.goto('/?scenario=slow&devtools=off')
  await expect(page.getByLabel('Carregando NFTs')).toBeVisible()
  await expect(page.getByTestId('nft-card')).toHaveCount(9, { timeout: 15_000 })
  await expect(page.getByLabel('Carregando NFTs')).toHaveCount(0)
})

test('falha de conexão mostra o erro e recupera com "Tentar de novo"', async ({ page }) => {
  await page.goto('/?scenario=offline&devtools=off')
  // As queries repetem 2 vezes em erro de rede antes de mostrar a falha.
  await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o catálogo.' })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByTestId('nft-card')).toHaveCount(0)

  await page.evaluate(() => window.__kurio!.setScenario('default'))
  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(page.getByTestId('nft-card')).toHaveCount(9)
})
