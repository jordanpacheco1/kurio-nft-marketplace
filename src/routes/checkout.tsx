import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/features/auth/queries'
import { ComingSoon } from '@/shared/ui/coming-soon'

// Provisória: o pagamento entra na Fase 5. A proteção da rota já vale.
export const Route = createFileRoute('/checkout')({
  beforeLoad: requireAuth,
  component: () => <ComingSoon title="Pagamento" />,
})
