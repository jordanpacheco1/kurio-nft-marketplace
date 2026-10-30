import { createFileRoute } from '@tanstack/react-router'
import { AuthScreen } from '@/features/auth/components/auth-screen'
import { authSearchSchema, skipIfAuthenticated } from '@/features/auth/search'

export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  beforeLoad: skipIfAuthenticated,
  component: LoginPage,
})

function LoginPage() {
  return <AuthScreen mode="login" search={Route.useSearch()} />
}
