import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import {
  getScenario,
  getSeed,
  SCENARIOS,
  setLatency,
  getLatencyOverride,
  type ScenarioId,
} from '@/mocks/scenarios/registry'

// Painel de demonstração. Usa a mesma superfície do `window.__kurio` que os testes usam.

/** Chaves do app (sessão, carrinho de visitante, pedido pendente). O reset também as limpa. */
const APP_KEYS = /^kurio\.(?!mockdb|scenario|seed|devtools)/

function clearAppStorage() {
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of Object.keys(storage)) if (APP_KEYS.test(key)) storage.removeItem(key)
  }
}

const field =
  'w-full rounded-md border border-input bg-ink px-2 py-1.5 text-caption text-fg focus-visible:outline-2 focus-visible:outline-copper'
const action =
  'rounded-md border border-line-strong px-3 py-1.5 text-caption text-fg hover:border-copper focus-visible:outline-2 focus-visible:outline-copper'

export default function ScenarioPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const titleId = useId()
  const rootRef = useRef<HTMLElement>(null)
  const [scenario, setScenarioValue] = useState<ScenarioId>(getScenario())
  const [seed, setSeedValue] = useState(String(getSeed()))
  const [latency, setLatencyValue] = useState(String(getLatencyOverride() ?? ''))
  const [status, setStatus] = useState('')

  useEffect(() => {
    rootRef.current?.querySelector<HTMLElement>('select')?.focus()
  }, [])

  const kurio = window.__kurio!

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose()
  }

  const apply = () => {
    const parsedSeed = Number(seed)
    kurio.setScenario(scenario, Number.isSafeInteger(parsedSeed) ? parsedSeed : getSeed())
    location.reload()
  }

  const reset = () => {
    kurio.reset(scenario)
    clearAppStorage()
    location.assign('/')
  }

  const applyLatency = () => {
    const ms = latency.trim() === '' ? null : Math.max(0, Number(latency))
    setLatency(Number.isFinite(ms) ? ms : null)
    setStatus(ms === null ? 'Latência do cenário restaurada.' : `Latência fixa em ${ms} ms.`)
  }

  return (
    <section
      ref={rootRef}
      id={id}
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      className="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-lg border border-line-strong bg-surface-raised p-4 text-fg shadow-xl"
    >
      <h2 id={titleId} className="text-body font-bold">
        Cenários da simulação
      </h2>

      <label className="flex flex-col gap-1 text-caption">
        Cenário
        <select className={field} value={scenario} onChange={(event) => setScenarioValue(event.target.value as ScenarioId)}>
          {(Object.keys(SCENARIOS) as ScenarioId[]).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        <span className="text-tiny leading-4 text-fg-secondary">{SCENARIOS[scenario]}</span>
      </label>

      <label className="flex flex-col gap-1 text-caption">
        Seed
        <input className={field} inputMode="numeric" value={seed} onChange={(event) => setSeedValue(event.target.value)} />
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={action} onClick={apply}>
          Aplicar e recarregar
        </button>
        <button type="button" className={action} onClick={reset}>
          Resetar dados
        </button>
      </div>

      <label className="flex flex-col gap-1 text-caption">
        Latência fixa (ms, vazio = do cenário)
        <span className="flex gap-2">
          <input className={field} inputMode="numeric" value={latency} onChange={(event) => setLatencyValue(event.target.value)} />
          <button type="button" className={action} onClick={applyLatency}>
            Aplicar
          </button>
        </span>
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={action}
          onClick={() => {
            kurio.dropSocket(5000)
            setStatus('Socket derrubado por 5 s.')
          }}
        >
          Derrubar socket (5 s)
        </button>
        <button
          type="button"
          className={action}
          onClick={() => {
            kurio.expireSession()
            setStatus('Sessões expiradas.')
          }}
        >
          Expirar sessão
        </button>
      </div>

      <p role="status" className="min-h-4 text-tiny leading-4 text-fg-secondary">
        {status}
      </p>
    </section>
  )
}
