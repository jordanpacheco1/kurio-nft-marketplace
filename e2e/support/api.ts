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
