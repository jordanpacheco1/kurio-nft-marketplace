import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireAuth } from '@/features/auth/queries'

// Tudo abaixo de /perfil exige sessão. As telas chegam na Fase 6.
export const Route = createFileRoute('/perfil')({
  beforeLoad: requireAuth,
  component: Outlet,
})
