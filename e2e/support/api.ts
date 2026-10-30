import type { Page } from '@playwright/test'

export type ApiResult<T = unknown> = { status: number; body: T; headers: Record<string, string> }

type Options = { body?: unknown; token?: string; cartId?: string; headers?: Record<string, string> }

/** Abre o app, espera os mocks e zera a latência. Cada teste parte de um contexto novo (banco da seed). */
export async function bootMocks(page: Page, path = '/') {
  await page.goto(path)
  await page.waitForFunction(() => !!window.__kurio)
  await page.evaluate(() => window.__kurio!.setLatency(0))
}

/**
 * Faz a requisição de dentro da página, para passar pelo service worker do MSW
 * (o mesmo caminho do Axios do app). Não usa o `request` do Playwright, que sairia direto para a rede.
 */
export async function call<T = unknown>(page: Page, method: string, path: string, options: Options = {}) {
  return page.evaluate(
    async ({ method, path, options }) => {
      const headers: Record<string, string> = { ...options.headers }
      if (options.body !== undefined) headers['Content-Type'] = 'application/json'
      if (options.token) headers.Authorization = `Bearer ${options.token}`
      if (options.cartId) headers['X-Cart-Id'] = options.cartId
      const response = await fetch(`/api${path}`, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      })
      const text = await response.text()
      return {
        status: response.status,
        body: text ? JSON.parse(text) : null,
        headers: Object.fromEntries(response.headers.entries()),
      }
    },
    { method, path, options },
  ) as Promise<ApiResult<T>>
}

export const PASSWORD = 'Kurio@2026'

export async function login(page: Page, email = 'colecionador@kurio.test') {
  const result = await call<{ token: string; user: { id: string } }>(page, 'POST', '/auth/login', {
    body: { email, password: PASSWORD },
  })
  if (result.status !== 200) throw new Error(`login falhou: ${result.status}`)
  return result.body
}

/** Id do carrinho de visitante que o app criou (header `X-Cart-Id`). */
export async function guestCartId(page: Page) {
  await page.waitForFunction(() => !!localStorage.getItem('kurio.cartId'))
  return page.evaluate(() => localStorage.getItem('kurio.cartId')!)
}

type Line = { nftId: string; editionId: string; quantity: number }

/** Põe itens no carrinho pela API: de visitante (`cartId`) ou do usuário (`token`). */
export async function seedCart(page: Page, lines: Line[], auth: { cartId?: string; token?: string }) {
  for (const body of lines) {
    const result = await call(page, 'POST', '/cart/items', { body, ...auth })
    if (result.status >= 300) throw new Error(`seedCart falhou: ${result.status}`)
  }
}

/** Valor da API como a interface mostra (`formatEth`): pelo menos 2 casas. */
export function eth(value: string) {
  const [int, dec = ''] = value.split('.')
  return `${int}.${dec.padEnd(2, '0')} ETH`
}

/** Preenche e envia o formulário de login (dialog no desktop, página no mobile). */
export async function signIn(page: Page, email = 'colecionador@kurio.test', password = PASSWORD) {
  const form = page.getByRole('form', { name: 'Entrar' })
  await form.getByLabel('E-mail').fill(email)
  await form.getByLabel('Senha', { exact: true }).fill(password)
  await form.getByRole('button', { name: 'Entrar', exact: true }).click()
}
