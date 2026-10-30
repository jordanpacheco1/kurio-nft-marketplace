import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/shared/ui/coming-soon'

// Provisória: a tela entra na Fase 6. A rota já é protegida pelo layout /perfil.
export const Route = createFileRoute('/perfil/favoritos')({
  component: () => <ComingSoon title="Lista de interesse" />,
})
