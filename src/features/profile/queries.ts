import { queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { changePassword, fetchProfile, removeAvatar, updateProfile, uploadAvatar } from '@/features/profile/api'
import type { AvatarInput, CurrentSession, PasswordChange, Profile, ProfileUpdate } from '@/shared/contracts'

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ['me', userId, 'profile'],
    queryFn: ({ signal }) => fetchProfile(signal),
    staleTime: 60_000,
  })

/** O perfil salvo substitui o cache e atualiza o usuário da sessão (nome e avatar do header). */
function storeProfile(queryClient: QueryClient, profile: Profile) {
  queryClient.setQueryData(profileQuery(profile.userId).queryKey, profile)
  queryClient.setQueriesData<CurrentSession>({ queryKey: ['session'] }, (session) =>
    session && session.user.id === profile.userId
      ? {
          ...session,
          user: {
            ...session.user,
            displayName: profile.displayName,
            username: profile.username,
            email: profile.email,
            avatarUrl: profile.avatarUrl,
          },
        }
      : session,
  )
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProfileUpdate) => updateProfile(input),
    onSuccess: (profile) => storeProfile(queryClient, profile),
  })
}

export function useAvatar() {
  const queryClient = useQueryClient()
  const upload = useMutation({
    mutationFn: (input: AvatarInput) => uploadAvatar(input),
    onSuccess: (profile) => storeProfile(queryClient, profile),
  })
  const remove = useMutation({
    mutationFn: () => removeAvatar(),
    onSuccess: (profile) => storeProfile(queryClient, profile),
  })
  return { upload, remove, isPending: upload.isPending || remove.isPending }
}

export function useChangePassword() {
  return useMutation({ mutationFn: (input: PasswordChange) => changePassword(input) })
}
