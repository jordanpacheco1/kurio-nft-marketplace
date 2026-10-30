import { expect, test, type Page } from '@playwright/test'
import { bootMocks, call, login, PASSWORD } from './support/api'

// Cenário 8 do enunciado: edição de perfil, avatar, senha e carteiras, com erros de validação
// (do cliente e da API) e alterações que permanecem depois do refresh.

// PNG 2×2 válido, para o avatar.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGO41OVzqcuHQYSXS4SXCwAlIwOnUN25vwAAAABJRU5ErkJggg==',
  'base64',
)

async function openAs(page: Page, path: string, email = 'colecionador@kurio.test') {
  await bootMocks(page, '/?devtools=off')
  const { token } = await login(page, email)
  await page.evaluate((value) => localStorage.setItem('kurio.token', value), token)
  await page.goto(path)
}

const liveRegion = (page: Page) => page.getByTestId('live-region')

test('perfil: validação, conflito da API e alteração que sobrevive ao refresh', async ({ page, isMobile }) => {
  await openAs(page, '/perfil')
  const form = page.getByRole('form', { name: 'Perfil do colecionador' })
  const displayName = form.getByRole('textbox', { name: 'Nome de exibição' })
  const username = form.getByRole('textbox', { name: 'Nome de usuário' })
  const ens = form.getByRole('textbox', { name: 'Nome ENS (opcional)' })
  await expect(displayName).toHaveValue('Rafa Colecionador')
  await expect(ens).toHaveValue('rafa.kurio')

  // Cliente: erros nos campos e foco no primeiro inválido
  await displayName.fill('R')
  await ens.fill('Rafa Kurio')
  await form.getByRole('button', { name: 'Salvar' }).click()
  await expect(displayName).toBeFocused()
  await expect(displayName).toHaveAccessibleDescription('Mínimo de 2 caracteres')
  await expect(ens).toHaveAccessibleDescription(/terminado em \.eth/)

  // API: usuário já em uso por outra conta, apontado no campo
  await displayName.fill('Rafa K.')
  await ens.fill('rafa-k')
  await username.fill('curadora')
  await form.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Já existe uma conta com esses dados.' })).toBeVisible()
  await expect(username).toHaveAccessibleDescription('Este nome de usuário já está em uso')
  await expect(username).toBeFocused()

  // Sucesso: só o que mudou vai no PATCH; o header acompanha e tudo volta depois do refresh
  await username.fill('rafa.k')
  const patch = page.waitForRequest((r) => r.url().endsWith('/api/me/profile') && r.method() === 'PATCH')
  await form.getByRole('button', { name: 'Salvar' }).click()
  expect((await patch).postDataJSON()).toEqual({ displayName: 'Rafa K.', username: 'rafa.k', ensName: 'rafa-k.eth' })
  await expect(liveRegion(page)).toHaveText('Perfil atualizado.')
  if (!isMobile) await expect(page.getByRole('button', { name: 'Conta de Rafa K.' })).toBeVisible()

  await page.reload()
  await expect(displayName).toHaveValue('Rafa K.')
  await expect(username).toHaveValue('rafa.k')
  await expect(ens).toHaveValue('rafa-k')
})

test('avatar: alterar, recusar arquivo inválido e remover', async ({ page, isMobile }) => {
  await openAs(page, '/perfil')
  const input = page.getByTestId('avatar-input')
  await expect(page.getByText('Sem avatar')).toBeAttached()

  await input.setInputFiles({ name: 'notas.txt', mimeType: 'text/plain', buffer: Buffer.from('não é imagem') })
  await expect(page.getByRole('group', { name: 'Avatar' })).toHaveAccessibleDescription('Escolha um arquivo de imagem.')

  // Redimensionado no cliente para 256 px e salvo como data URL
  const put = page.waitForRequest((r) => r.url().endsWith('/api/me/avatar') && r.method() === 'PUT')
  await input.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
  expect((await put).postDataJSON().dataUrl).toMatch(/^data:image\/(webp|jpeg);base64,/)
  const avatar = page.getByRole('img', { name: 'Seu avatar' })
  await expect(avatar).toBeVisible()
  expect(await avatar.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(256)
  if (!isMobile) await expect(page.locator('header img[src^="data:image"]')).toBeVisible()

  await page.reload()
  await expect(avatar).toBeVisible()

  await page.getByRole('button', { name: 'Remover avatar' }).click()
  await expect(liveRegion(page)).toHaveText('Avatar removido')
  await expect(page.getByText('Sem avatar')).toBeAttached()
  await expect(page.getByRole('button', { name: 'Remover avatar' })).toBeDisabled()
  await page.reload()
  await expect(page.getByText('Sem avatar')).toBeAttached()
})

test('senha: atual incorreta, confirmação diferente e troca efetiva', async ({ page }) => {
  await openAs(page, '/perfil')
  const form = page.getByRole('form', { name: 'Perfil do colecionador' })
  const current = form.getByLabel('Senha atual', { exact: true })
  const next = form.getByLabel('Nova senha', { exact: true })
  const confirm = form.getByLabel('Confirmar nova senha', { exact: true })
  const save = form.getByRole('button', { name: 'Salvar' })

  // Preencher um campo exige os outros
  await next.fill('NovaSenha2026')
  await save.click()
  await expect(current).toBeFocused()
  await expect(current).toHaveAccessibleDescription('Informe a senha atual')
  await expect(confirm).toHaveAccessibleDescription('Confirme a nova senha')

  await current.fill(PASSWORD)
  await confirm.fill('OutraSenha2026')
  await save.click()
  await expect(confirm).toHaveAccessibleDescription('As senhas não conferem')

  // Erro da API no campo
  await current.fill('senhaErrada1')
  await confirm.fill('NovaSenha2026')
  await save.click()
  await expect(current).toHaveAccessibleDescription('Senha atual incorreta')

  await current.fill(PASSWORD)
  await save.click()
  await expect(liveRegion(page)).toHaveText('Senha alterada.')
  await expect(current).toHaveValue('')

  // Vale no servidor: a senha antiga deixa de funcionar e a nova entra
  const body = (password: string) => ({ body: { email: 'colecionador@kurio.test', password } })
  expect((await call(page, 'POST', '/auth/login', body(PASSWORD))).status).toBe(401)
  expect((await call(page, 'POST', '/auth/login', body('NovaSenha2026'))).status).toBe(200)
})

test('carteiras: principal e secundária com validação, "Igual à principal" e edição', async ({ page }) => {
  await openAs(page, '/perfil/carteiras', 'curadora@kurio.test') // sem carteiras na seed
  const primary = page.getByRole('form', { name: 'Carteira principal' })
  const label = primary.getByRole('textbox', { name: 'Apelido da carteira' })
  const address = primary.getByRole('textbox', { name: 'Endereço da carteira' })

  // Cliente: campos vazios e endereço inválido
  await primary.getByRole('button', { name: 'Adicionar carteira principal' }).click()
  await expect(label).toBeFocused()
  await expect(label).toHaveAccessibleDescription('Mínimo de 2 caracteres')
  await expect(primary.getByRole('combobox', { name: 'Rede' })).toHaveAccessibleDescription('Selecione uma rede')
  await expect(primary.getByRole('combobox', { name: 'Tipo de carteira' })).toHaveAccessibleDescription('Selecione o tipo de carteira')

  await label.fill('Cofre')
  await primary.getByRole('combobox', { name: 'Rede' }).selectOption('polygon')
  await primary.getByRole('combobox', { name: 'Tipo de carteira' }).selectOption('walletconnect')
  await address.fill('0x123')
  await primary.getByRole('button', { name: 'Adicionar carteira principal' }).click()
  await expect(address).toHaveAccessibleDescription(/^Informe um endereço 0x… válido ou um nome \.eth/)

  // API: endereço que já é de outra conta (regra fixa do mock)
  await address.fill('0xA91F3c7d5B2e8F0a4C6d1E9b7A3f5D2c8B04E82C')
  await primary.getByRole('button', { name: 'Adicionar carteira principal' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Este endereço já está ligado a outra conta.' })).toBeVisible()
  await expect(address).toHaveAccessibleDescription(/^Endereço já cadastrado em outra conta/)

  const primaryAddress = '0x1111222233334444555566667777888899990000'
  await address.fill(primaryAddress)
  await primary.getByRole('button', { name: 'Adicionar carteira principal' }).click()
  await expect(liveRegion(page)).toHaveText('Carteira principal cadastrada')

  // Secundária: "Igual à carteira principal" abre o formulário preenchido com a principal
  await expect(page.getByText('Você ainda não adicionou uma carteira secundária.')).toBeVisible()
  await page.getByRole('checkbox', { name: 'Igual à carteira principal' }).check()
  const secondary = page.getByRole('form', { name: 'Carteira secundária' })
  await expect(secondary.getByRole('textbox', { name: 'Endereço da carteira' })).toHaveValue(primaryAddress)
  await expect(secondary.getByRole('combobox', { name: 'Rede' })).toHaveValue('polygon')
  await expect(secondary.getByRole('combobox', { name: 'Tipo de carteira' })).toHaveValue('walletconnect')
  await secondary.getByRole('textbox', { name: 'Apelido da carteira' }).fill('Reserva')
  await secondary.getByRole('combobox', { name: 'Rede' }).selectOption('ethereum')
  await secondary.getByRole('button', { name: 'Adicionar carteira secundária' }).click()
  await expect(liveRegion(page)).toHaveText('Carteira secundária cadastrada')

  // Edição da principal (PATCH)
  await label.fill('Cofre frio')
  await primary.getByRole('button', { name: 'Salvar carteira principal' }).click()
  await expect(liveRegion(page)).toHaveText('Carteira principal atualizada')

  // Tudo permanece depois do refresh
  await page.reload()
  await expect(label).toHaveValue('Cofre frio')
  await expect(address).toHaveValue(primaryAddress)
  await expect(secondary.getByRole('textbox', { name: 'Apelido da carteira' })).toHaveValue('Reserva')
  await expect(secondary.getByRole('combobox', { name: 'Rede' })).toHaveValue('ethereum')
})

test('lista de interesse mostra os favoritos do usuário', async ({ page }) => {
  await openAs(page, '/perfil/favoritos')
  const cards = page.getByTestId('nft-card')
  await expect(cards).toHaveCount(2)
  await expect(cards.filter({ hasText: 'Sage Nomad #009' })).toBeVisible()
  const removed = page.waitForResponse((r) => r.url().includes('/api/me/favorites/golden-beat-207') && r.request().method() === 'DELETE')
  await cards.filter({ hasText: 'Golden Beat #207' }).getByRole('button', { name: 'Favoritar Golden Beat #207' }).click()
  await expect(cards).toHaveCount(1) // otimista: sai da lista na hora
  expect((await removed).status()).toBe(200)
  await page.reload()
  await expect(cards).toHaveCount(1)
})
