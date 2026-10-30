import { api } from '@/shared/api/client'
import { profileSchema, type AvatarInput, type PasswordChange, type ProfileUpdate } from '@/shared/contracts'

export async function fetchProfile(signal?: AbortSignal) {
  const { data } = await api.get('/me/profile', { signal })
  return profileSchema.parse(data)
}

export async function updateProfile(input: ProfileUpdate) {
  const { data } = await api.patch('/me/profile', input)
  return profileSchema.parse(data)
}

export async function uploadAvatar(input: AvatarInput) {
  const { data } = await api.put('/me/avatar', input)
  return profileSchema.parse(data)
}

export async function removeAvatar() {
  const { data } = await api.delete('/me/avatar')
  return profileSchema.parse(data)
}

export async function changePassword(input: PasswordChange) {
  await api.post('/me/password', input)
}
