import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function NotFound() {
  return (
    <section className="mx-auto flex max-w-page flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-display font-bold text-copper-text">404</p>
      <h1 className="text-heading">Página não encontrada</h1>
      <p className="text-sm text-fg-secondary">O endereço pode ter mudado ou nunca ter existido.</p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  )
}
