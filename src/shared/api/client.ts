import axios, { type InternalAxiosRequestConfig } from 'axios'
import { mocksReady } from '@/app/boot'
import { getGuestCartId, getToken } from '@/shared/api/credentials'
import { toApiError } from '@/shared/api/errors'

/** Timeout do cliente. Feito com AbortController + setTimeout para o `page.clock` do Playwright controlar. */
export const REQUEST_TIMEOUT_MS = 10_000

type TimedConfig = InternalAxiosRequestConfig & { timeoutTimer?: ReturnType<typeof setTimeout>; timedOut?: boolean }

// Arrays vão repetidos na query string (`collections=a&collections=b`), como o contrato pede.
export const api = axios.create({ baseURL: '/api', paramsSerializer: { indexes: null } })

api.interceptors.request.use(async (config: TimedConfig) => {
  // Nenhuma requisição sai antes do service worker do MSW estar ativo.
  await mocksReady

  const token = getToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  config.headers.set('X-Cart-Id', getGuestCartId())

  // Junta o signal de quem chamou (TanStack Query) com o do timeout.
  const controller = new AbortController()
  config.timeoutTimer = setTimeout(() => {
    config.timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)
  const external = config.signal as AbortSignal | undefined
  config.signal = external ? AbortSignal.any([external, controller.signal]) : controller.signal
  return config
})

api.interceptors.response.use(
  (response) => {
    clearTimeout((response.config as TimedConfig).timeoutTimer)
    return response
  },
  (error: unknown) => {
    const config = axios.isAxiosError(error) ? (error.config as TimedConfig | undefined) : undefined
    clearTimeout(config?.timeoutTimer)
    return Promise.reject(toApiError(error, config?.timedOut))
  },
)
