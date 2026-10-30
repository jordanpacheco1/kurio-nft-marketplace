import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useCurrentUser, useLogout } from '@/features/auth/queries'

// Provisória: a tela de perfil entra na Fase 6. Já tem o "Sair", que no mobile não tem outro lugar.
export const Route = createFileRoute('/perfil/')({
  component: ProfilePlaceholder,
})

function ProfilePlaceholder() {
  const { user } = useCurrentUser()
  const logout = useLogout()
  return (
    <section className="page-container flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-heading">Perfil</h1>
      {user && <p className="text-body text-fg">{user.displayName}</p>}
      <p className="text-sm text-fg-secondary">A edição do perfil está em construção.</p>
      <Button variant="outline" onClick={() => logout.mutate()} disabled={logout.isPending}>
        Sair da conta
      </Button>
    </section>
  )
}
