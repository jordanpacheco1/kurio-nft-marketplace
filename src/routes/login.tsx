import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ComingSoon } from '@/shared/ui/coming-soon'

// Provisória: o login de verdade entra na Fase 4. O `redirect` já faz parte do contrato da rota.
export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  component: () => <ComingSoon title="Entrar" />,
})
