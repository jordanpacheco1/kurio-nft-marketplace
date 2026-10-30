import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/features/auth/queries'
import { ProfileLayout } from '@/features/profile/components/profile-layout'

// Tudo abaixo de /perfil exige sessão e divide o menu "Meu perfil".
export const Route = createFileRoute('/perfil')({
  beforeLoad: requireAuth,
  component: ProfileLayout,
})
