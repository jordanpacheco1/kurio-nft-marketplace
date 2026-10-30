import { lazy, StrictMode, Suspense, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

// Botão flutuante "Cenários". O painel só é baixado no primeiro clique.
// `?devtools=off` esconde o botão (e lembra a escolha); `?devtools=on` mostra de novo.
const STORAGE_KEY = 'kurio.devtools'
const ScenarioPanel = lazy(() => import('@/mocks/devtools/panel'))

function isHidden() {
  const flag = new URLSearchParams(location.search).get('devtools')
  try {
    if (flag) localStorage.setItem(STORAGE_KEY, flag)
    return (flag ?? localStorage.getItem(STORAGE_KEY)) === 'off'
  } catch {
    return flag === 'off'
  }
}

function ScenarioLauncher() {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  return (
    <div className="fixed right-4 bottom-20 z-50 flex flex-col items-end gap-2 lg:bottom-4">
      {open && (
        <Suspense fallback={<div className="skeleton h-40 w-72 rounded-lg" aria-hidden="true" />}>
          <ScenarioPanel id="kurio-scenarios" onClose={close} />
        </Suspense>
      )}
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="kurio-scenarios"
        onClick={() => (open ? close() : setOpen(true))}
        className="rounded-full border border-line-strong bg-surface-raised px-4 py-2 text-caption text-fg shadow-lg hover:border-copper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper"
      >
        Cenários
      </button>
    </div>
  )
}

export function mountScenarioPanel() {
  if (isHidden() || document.getElementById('kurio-devtools')) return
  const host = document.createElement('div')
  host.id = 'kurio-devtools'
  document.body.append(host)
  createRoot(host).render(
    <StrictMode>
      <ScenarioLauncher />
    </StrictMode>,
  )
}
