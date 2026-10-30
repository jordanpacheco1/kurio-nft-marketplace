import { expect, test, type Page } from '@playwright/test'
import { bootMocks, login, PASSWORD } from './support/api'

// Cenário 11 do enunciado: navegação só por teclado, foco em dialogs e validação de formulários.
// (A validação campo a campo de cadastro, perfil, carteiras e checkout está nos specs de cada fluxo;
// aqui o foco é chegar, preencher e enviar sem mouse.)

/** Elemento focado está dentro de `selector`? */
const focusInside = (page: Page, selector: string) =>
  page.evaluate((selector) => !!document.activeElement?.closest(selector), selector)

/** Aperta Tab até o foco chegar em `target` (ou falha depois de `max` tentativas). */
async function tabTo(page: Page, target: ReturnType<Page['getByRole']>, max = 40) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    if (await target.evaluate((element) => element === document.activeElement)) return
  }
  throw new Error(`Tab não chegou em ${target}`)
}

test('pular para o conteúdo e comprar só com o teclado', async ({ page }) => {
  await bootMocks(page, '/?devtools=off')
  await expect(page.getByRole('link', { name: 'Emerald Ape #042' }).first()).toBeVisible()

  // O primeiro Tab mostra o link de pular; Enter leva o próximo Tab para dentro do <main>
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
  await expect(skip).toBeFocused()
  await expect(skip).toBeInViewport()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  expect(await focusInside(page, 'main')).toBe(true)

  // Card → detalhe com Enter
  await tabTo(page, page.getByRole('link', { name: 'Emerald Ape #042' }).first())
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/nft\/emerald-ape-042/)

  // Edição com as setas (grupo de rádios), quantidade e carrinho com Enter/Espaço
  const editions = page.getByRole('group', { name: 'Edição:' })
  const first = editions.getByRole('radio').first()
  await first.focus()
  await page.keyboard.press('ArrowRight')
  await expect(editions.getByRole('radio').nth(1)).toBeChecked()
  await expect(editions.getByRole('radio').nth(1)).toBeFocused()

  await page.getByRole('button', { name: 'Aumentar quantidade' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('group', { name: 'Quantidade' }).locator('output')).toHaveText('2')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).focus()
  await page.keyboard.press('Space')
  // Confirmação anunciada na região aria-live (além do toast)
  await expect(page.getByTestId('live-region')).toHaveText('Emerald Ape #042 adicionado ao carrinho')

  // Carrinho: a linha tem a quantidade escolhida e sai com o teclado
  await page.goto('/carrinho?devtools=off')
  const remove = page.getByRole('button', { name: /^Remover Emerald Ape #042/ })
  await expect(remove).toBeVisible()
  await expect(page.getByRole('group', { name: /^Quantidade de Emerald Ape #042/ }).locator('output')).toHaveText('2')
  await remove.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
  // O foco não se perde no <body> quando a linha some: vai para o estado vazio
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeFocused()

  // O próximo Tab é a saída do estado vazio
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Explorar NFTs' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/#catalogo$/)
})

test('dialog de login prende o foco, envia com Enter e fecha com Escape', async ({ page, isMobile }) => {
  test.skip(isMobile, 'No mobile o login é uma página, não um dialog')
  await bootMocks(page, '/?devtools=off')
  await page.getByRole('link', { name: 'Entrar' }).focus()
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog', { name: 'Entrar' })
  await expect(dialog).toBeVisible()
  expect(await focusInside(page, '[role="dialog"]')).toBe(true)

  // Tab e Shift+Tab circulam dentro do dialog (o resto da página está inerte)
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab')
    expect(await focusInside(page, '[role="dialog"]')).toBe(true)
  }
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Shift+Tab')
    expect(await focusInside(page, '[role="dialog"]')).toBe(true)
  }

  // Enviar vazio com Enter: erro ligado ao campo e foco no primeiro inválido
  const form = dialog.getByRole('form', { name: 'Entrar' })
  const email = form.getByLabel('E-mail')
  await email.focus()
  await page.keyboard.press('Enter')
  await expect(email).toBeFocused()
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(email).toHaveAccessibleDescription('E-mail inválido')

  // Senha errada: erro geral anunciado (role=alert), sem sair do dialog
  await page.keyboard.type('colecionador@kurio.test')
  await page.keyboard.press('Tab')
  await page.keyboard.type('errada123')
  await page.keyboard.press('Enter')
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(dialog).toBeVisible()

  // Escape fecha e volta para a home
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/\?devtools=off$/)

  // Reabre e entra só com o teclado
  await page.getByRole('link', { name: 'Entrar' }).focus()
  await page.keyboard.press('Enter')
  await expect(email).toBeVisible()
  await email.focus()
  await page.keyboard.type('colecionador@kurio.test')
  await page.keyboard.press('Tab')
  await page.keyboard.type(PASSWORD)
  await page.keyboard.press('Enter')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: /^Conta de / })).toBeVisible()
})

test('login no mobile: Enter envia e o foco vai ao primeiro campo inválido', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'No desktop o login é dialog (teste acima)')
  await bootMocks(page, '/login?devtools=off')
  const form = page.getByRole('form', { name: 'Entrar' })
  const password = form.getByLabel('Senha', { exact: true })
  await password.focus()
  await page.keyboard.type(PASSWORD)
  await page.keyboard.press('Enter')
  await expect(form.getByLabel('E-mail')).toBeFocused()
  await expect(form.getByLabel('E-mail')).toHaveAccessibleDescription('E-mail inválido')
  await page.keyboard.type('colecionador@kurio.test')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/')
})

test('zoom da galeria: abre com Enter, Escape devolve o foco ao botão', async ({ page, isMobile }) => {
  test.skip(isMobile, 'O mobile não tem galeria nem lupa (imagem única, como no Figma)')
  await bootMocks(page, '/nft/emerald-ape-042?devtools=off')
  const trigger = page.getByRole('button', { name: 'Ampliar imagem', exact: true })
  await trigger.focus()
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog', { name: 'Emerald Ape #042' })
  await expect(dialog).toBeVisible()
  expect(await focusInside(page, '[role="dialog"]')).toBe(true)
  await page.keyboard.press('Tab')
  expect(await focusInside(page, '[role="dialog"]')).toBe(true)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('menu da conta abre e navega pelas setas', async ({ page, isMobile }) => {
  test.skip(isMobile, 'No mobile a conta fica na tab bar (link simples)')
  await bootMocks(page, '/?devtools=off')
  const { token } = await login(page)
  await page.evaluate((value) => localStorage.setItem('kurio.token', value), token)
  await page.goto('/?devtools=off')

  const trigger = page.getByRole('button', { name: /^Conta de / })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Perfil' })).toBeFocused()

  // Escape fecha e devolve o foco ao avatar
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(trigger).toBeFocused()

  // Seta para baixo abre; outra seta vai para "Carteiras"; Enter navega
  await page.keyboard.press('ArrowDown')
  await expect(menu).toBeVisible()
  await page.keyboard.press('ArrowDown')
  await expect(menu.getByRole('menuitem', { name: 'Carteiras' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/perfil/carteiras')
})
