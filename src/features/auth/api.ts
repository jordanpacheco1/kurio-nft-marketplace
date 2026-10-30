import { api } from '@/shared/api/client'
import {
  currentSessionSchema,
  sessionSchema,
  type LoginInput,
  type RegisterInput,
} from '@/shared/contracts'

export async function fetchSession(signal?: AbortSignal) {
  const { data } = await api.get('/auth/session', { signal })
  return currentSessionSchema.parse(data)
}

export async function login(input: LoginInput) {
  const { data } = await api.post('/auth/login', input)
  return sessionSchema.parse(data)
}

export async function register(input: RegisterInput) {
  const { data } = await api.post('/auth/register', input)
  return sessionSchema.parse(data)
}

export async function logout() {
  await api.post('/auth/logout')
}
