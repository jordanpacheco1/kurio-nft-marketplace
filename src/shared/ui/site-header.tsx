import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

// Versão simplificada da Fase 1; a busca, o carrinho e o menu logado entram na Fase 3.
const soon = ['Mercado', 'Criadores', 'Aprenda']

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-[45px] max-w-page items-center justify-between gap-4 px-4">
        <Link to="/" className="text-xs font-bold tracking-widest text-fg">
          KURIO
        </Link>
        <nav aria-label="Principal" className="hidden gap-8 text-sm lg:flex">
          <Link
            to="/"
            className="text-fg-secondary hover:text-fg"
            activeProps={{ className: 'text-copper-text underline decoration-copper underline-offset-[14px]' }}
            activeOptions={{ exact: true }}
          >
            Início
          </Link>
          {soon.map((label) => (
            <span key={label} aria-disabled="true" title="Em breve" className="cursor-not-allowed text-fg-muted">
              {label}
            </span>
          ))}
        </nav>
        <Button size="sm" disabled title="Em breve">
          Entrar
        </Button>
      </div>
    </header>
  )
}
