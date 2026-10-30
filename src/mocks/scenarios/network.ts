import { delay, HttpResponse } from 'msw'
import type { ErrorCode } from '@/shared/contracts'
import { getLatencyOverride, getScenario, prngFor } from '@/mocks/scenarios/registry'
import { apiError } from '@/mocks/handlers/http'
import type { Prng } from '@/mocks/scenarios/prng'

// Condições de rede aplicadas antes de cada handler REST. O `delay` do MSW usa setTimeout,
// então o `page.clock` do Playwright controla a latência.

type ForcedFailure = { method: string; pattern: RegExp; code: ErrorCode | 'NETWORK' }
const forced: ForcedFailure[] = []

/** Faz a próxima requisição que casar com `method` + `pattern` falhar. Usado pelos testes. */
export function failNext(method: string, pattern: string, code: ErrorCode | 'NETWORK' = 'UNAVAILABLE') {
  forced.push({ method: method.toUpperCase(), pattern: new RegExp(pattern), code })
}

export function clearForcedFailures() {
  forced.length = 0
}

function latencyFor(request: Request, random: Prng) {
  const override = getLatencyOverride()
  if (override !== null) return override
  switch (getScenario()) {
    case 'slow':
      return random.int(1500, 3000)
    case 'out-of-order': {
      const url = new URL(request.url)
      if (url.pathname !== '/api/nfts') return random.int(50, 150)
      // Quanto menor o termo, mais demora: digitar "ape" faz "a" chegar por último.
      const q = url.searchParams.get('q') ?? ''
      return Math.max(100, 1600 - q.length * 400)
    }
    default:
      return random.int(50, 150)
  }
}

/** Devolve uma resposta de falha, ou `null` para seguir para o handler. */
export async function applyNetwork(request: Request): Promise<Response | null> {
  const url = new URL(request.url)
  const path = url.pathname
  const random = prngFor(`${request.method} ${path}${url.search}`)
  const index = forced.findIndex((item) => item.method === request.method && item.pattern.test(path))
  if (index >= 0) {
    const [failure] = forced.splice(index, 1)
    await delay(latencyFor(request, random))
    return failure!.code === 'NETWORK' ? HttpResponse.error() : apiError(failure!.code, 'Falha simulada')
  }

  if (getScenario() === 'offline') return HttpResponse.error()

  await delay(latencyFor(request, random))

  if (getScenario() === 'flaky' && random.chance(0.3)) {
    return apiError('UNAVAILABLE', 'Serviço temporariamente indisponível. Tente de novo.')
  }
  return null
}
