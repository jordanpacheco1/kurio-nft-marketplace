import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/shared/ui/coming-soon'

// Provisória: a tela do carrinho entra na Fase 4.
export const Route = createFileRoute('/carrinho')({
  component: () => <ComingSoon title="Carrinho" />,
})
