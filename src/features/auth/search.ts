import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { safeRedirect, sessionQuery } from '@/features/auth/queries'
import { getToken } from '@/shared/api/credentials'

/** Search params de `/login` e `/cadastro`: para onde voltar e por que o usuário caiu aqui. */
export const authSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  reason: z.enum(['expired']).optional().catch(undefined),
})

/** Quem já tem sessão válida não vê o login: segue direto para o destino. */
export async function skipIfAuthenticated({ context, search }: { context: { queryClient: QueryClient }; search: z.infer<typeof authSearchSchema> }) {
  const token = getToken()
  if (!token) return
  try {
    await context.queryClient.ensureQueryData(sessionQuery(token))
  } catch {
    return
  }
  throw redirect({ href: safeRedirect(search.redirect), replace: true })
}
