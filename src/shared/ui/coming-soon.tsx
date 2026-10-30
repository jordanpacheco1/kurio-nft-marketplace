import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

// Tela provisória das rotas que as Fases 5 e 6 implementam (pagamento e perfil). Sai junto com elas.
export function ComingSoon({ title }: { title: string }) {
  return (
    <section className="page-container flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-heading">{title}</h1>
      <p className="text-sm text-fg-secondary">Esta tela está em construção.</p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  )
}
