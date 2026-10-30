import { expect, test, type Page } from '@playwright/test'
import { bootMocks, login, seedCart, signIn } from './support/api'

// Cenário 3 do enunciado: cadastro, login, expiração de sessão, logout e troca de usuário.
// Cenário 4 (parte): favoritos persistem por usuário e não vazam para outra conta.

const registerForm = (page: Page) => page.getByRole('form', { name: 'Criar conta' })
const submitRegister = (page: Page) => registerForm(page).getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()

test('cadastro valida os campos, trata conflito e entra na conta', async ({ page }) => {
  await bootMocks(page, '/cadastro?redirect=%2Fperfil&devtools=off')

  // Validação no cliente: erros ligados aos campos e foco no primeiro inválido
  const form = registerForm(page)
  await submitRegister(page)
  const username = form.getByLabel('Nome de usuário', { exact: true })
  await expect(username).toBeFocused()
  await expect(username).toHaveAttribute('aria-invalid', 'true')
  await expect(username).toHaveAccessibleDescription('Mínimo de 3 caracteres')
  await expect(form.getByLabel('E-mail')).toHaveAccessibleDescription('E-mail inválido')

  await username.fill('colecionador')
  await form.getByLabel('E-mail').fill('colecionador@kurio.test')
  await form.getByLabel('Senha', { exact: true }).fill('senha1234')
  await form.getByLabel('Confirmar senha', { exact: true }).fill('outra1234')
  await submitRegister(page)
  await expect(form.getByLabel('Confirmar senha', { exact: true })).toHaveAccessibleDescription('As senhas não conferem')

  // Conflito: regra fixa do mock (e-mail e usuário já cadastrados), apontando cada campo
  await form.getByLabel('Confirmar senha', { exact: true }).fill('senha1234')
  await submitRegister(page)
  await expect(page.getByRole('alert').filter({ hasText: 'Já existe uma conta com esses dados.' })).toBeVisible()
  await expect(username).toHaveAccessibleDescription('Este nome de usuário já está em uso')
  await expect(form.getByLabel('E-mail')).toHaveAccessibleDescription('Este e-mail já está cadastrado')

  // Sucesso: entra e volta para onde ia; a sessão sobrevive ao refresh
  await username.fill('nova.colecionadora')
  await form.getByLabel('E-mail').fill('nova@kurio.test')
  await submitRegister(page)
  await expect(page).toHaveURL('/perfil')
  await expect(page.getByText('nova.colecionadora')).toBeVisible()
  await page.reload()
  await expect(page).toHaveURL('/perfil')
  await expect(page.getByText('nova.colecionadora')).toBeVisible()
})

test('login com senha errada e retorno ao fluxo anterior', async ({ page, isMobile }) => {
  await bootMocks(page, '/?devtools=off') // o painel fica escondido nas próximas navegações
  await page.goto('/nft/emerald-ape-042')
  const favorite = isMobile
    ? page.getByRole('button', { name: 'Favoritar Emerald Ape #042' })
    : page.getByRole('button', { name: /^Favorit(ar|ado)$/ })
  await favorite.click()
  await expect(page).toHaveURL(/\/login\?redirect=%2Fnft%2Femerald-ape-042/)

  await signIn(page, 'colecionador@kurio.test', 'senhaErrada1')
  await expect(page.getByRole('alert').filter({ hasText: 'E-mail ou senha incorretos.' })).toBeVisible()

  await signIn(page)
  await expect(page).toHaveURL('/nft/emerald-ape-042')
  const saved = page.waitForResponse((r) => r.url().includes('/api/me/favorites/') && r.request().method() === 'PUT')
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
  expect((await saved).status()).toBe(200)

  // Favorito salvo para o usuário: continua marcado depois do refresh
  await page.reload()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
})

test('rota protegida leva ao login e volta depois de entrar', async ({ page }) => {
  await bootMocks(page, '/?devtools=off')
  await page.goto('/perfil')
  await expect(page).toHaveURL('/login?redirect=%2Fperfil')
  await signIn(page)
  await expect(page).toHaveURL('/perfil')
  await expect(page.getByRole('heading', { name: 'Perfil', exact: true })).toBeVisible()
})

test('sessão que expira durante a navegação volta para a mesma tela', async ({ page }) => {
  await bootMocks(page, '/?devtools=off')
  const { token } = await login(page)
  await seedCart(page, [{ nftId: 'emerald-ape-042', editionId: 'e10', quantity: 1 }], { token })
  await page.evaluate((value) => localStorage.setItem('kurio.token', value), token)
  await page.goto('/carrinho')
  await expect(page.getByTestId('cart-line')).toHaveCount(1)

  await page.evaluate(() => window.__kurio!.expireSession())
  await page.getByRole('button', { name: 'Aumentar quantidade de Emerald Ape #042 (1/10)' }).click()

  await expect(page).toHaveURL('/login?redirect=%2Fcarrinho&reason=expired')
  await expect(page.getByRole('alert').filter({ hasText: 'Sua sessão expirou' })).toBeVisible()
  await signIn(page)
  await expect(page).toHaveURL('/carrinho')
  await expect(page.getByRole('group', { name: 'Quantidade de Emerald Ape #042 (1/10)' }).getByRole('status')).toHaveText('1')
})

test('logout e troca de usuário limpam favoritos, carrinho e socket da sessão anterior', async ({ page, isMobile }) => {
  await bootMocks(page, '/login?redirect=%2F&devtools=off')
  await signIn(page) // colecionador: favoritos Sage Nomad e Golden Beat
  await expect(page).toHaveURL('/')

  const heart = (name: string) => {
    const card = page.getByTestId('nft-card').filter({ hasText: name })
    return card.getByRole('button', { name: `Favoritar ${name}` }).first()
  }
  const cartLink = (count: number) =>
    page.getByRole('link', { name: `Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}` }).locator('visible=true')

  await expect(heart('Sage Nomad #009')).toHaveAttribute('aria-pressed', 'true')
  const token = await page.evaluate(() => localStorage.getItem('kurio.token')!)
  await seedCart(page, [{ nftId: 'emerald-ape-042', editionId: 'open', quantity: 2 }], { token })
  await page.reload()
  await expect(cartLink(2)).toBeVisible()

  // Logout: menu da conta no desktop; no mobile, pela tela de perfil
  if (isMobile) {
    await page.goto('/perfil?devtools=off')
    await page.getByRole('button', { name: 'Sair da conta' }).click()
  } else {
    await page.getByRole('button', { name: 'Conta de Rafa Colecionador' }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
  }
  await expect(page).toHaveURL('/')
  await expect(page.getByTestId('live-region')).toHaveText('Você saiu da conta')
  await expect(heart('Sage Nomad #009')).toHaveAttribute('aria-pressed', 'false')
  await expect(cartLink(0)).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('kurio.token'))).toBeNull()

  // Outro usuário: só os dados dele (Neon Vessel favorito, carrinho vazio)
  await page.goto('/login?redirect=%2F&devtools=off')
  await signIn(page, 'curadora@kurio.test')
  await expect(page).toHaveURL('/')
  await expect(heart('Neon Vessel #552')).toHaveAttribute('aria-pressed', 'true')
  await expect(heart('Sage Nomad #009')).toHaveAttribute('aria-pressed', 'false')
  await expect(cartLink(0)).toBeVisible()
  // Um socket só, o da sessão nova
  await expect.poll(() => page.evaluate(() => window.__kurio!.connectedClients())).toBe(1)
})
