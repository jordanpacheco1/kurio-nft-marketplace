import { createFileRoute } from '@tanstack/react-router'
import { AuthScreen } from '@/features/auth/components/auth-screen'
import { authSearchSchema, skipIfAuthenticated } from '@/features/auth/search'

export const Route = createFileRoute('/cadastro')({
  validateSearch: authSearchSchema,
  beforeLoad: skipIfAuthenticated,
  component: RegisterPage,
})

function RegisterPage() {
  return <AuthScreen mode="register" search={Route.useSearch()} />
}
