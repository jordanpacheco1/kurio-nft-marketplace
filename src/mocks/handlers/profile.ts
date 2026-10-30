import { HttpResponse } from 'msw'
import { avatarInputSchema, passwordChangeSchema, profileUpdateSchema, type Profile } from '@/shared/contracts'
import { hashPassword, newSalt, verifyPassword } from '@/mocks/db/password'
import { toProfile } from '@/mocks/db/views'
import { assertUnique } from '@/mocks/handlers/auth'
import { fail, noContent, readBody, requireUser, route } from '@/mocks/handlers/http'

export const profileHandlers = [
  route('get', '/me/profile', ({ request }) => {
    const { user } = requireUser(request)
    return HttpResponse.json<Profile>(toProfile(user))
  }),

  route('patch', '/me/profile', async ({ request }) => {
    const { user } = requireUser(request)
    const input = await readBody(request, profileUpdateSchema)
    assertUnique(input, user.id)
    if (input.email) input.email = input.email.toLowerCase()
    Object.assign(user, input)
    return HttpResponse.json<Profile>(toProfile(user))
  }),

  route('put', '/me/avatar', async ({ request }) => {
    const { user } = requireUser(request)
    const { dataUrl } = await readBody(request, avatarInputSchema)
    user.avatarUrl = dataUrl
    return HttpResponse.json<Profile>(toProfile(user))
  }),

  route('delete', '/me/avatar', ({ request }) => {
    const { user } = requireUser(request)
    user.avatarUrl = null
    return HttpResponse.json<Profile>(toProfile(user))
  }),

  route('post', '/me/password', async ({ request }) => {
    const { user } = requireUser(request)
    const input = await readBody(request, passwordChangeSchema)
    if (!(await verifyPassword(input.currentPassword, user.passwordSalt, user.passwordHash))) {
      fail('VALIDATION_ERROR', 'Confira os campos destacados.', { fields: { currentPassword: 'Senha atual incorreta' } })
    }
    if (input.currentPassword === input.newPassword) {
      fail('VALIDATION_ERROR', 'Confira os campos destacados.', {
        fields: { newPassword: 'A nova senha precisa ser diferente da atual' },
      })
    }
    user.passwordSalt = newSalt()
    user.passwordHash = await hashPassword(input.newPassword, user.passwordSalt)
    return noContent()
  }),
]
