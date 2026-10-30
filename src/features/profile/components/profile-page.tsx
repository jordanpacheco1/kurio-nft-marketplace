import { useQuery } from '@tanstack/react-query'
import { useRef, useState, type FormEvent } from 'react'
import { Image } from 'react-iconly'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/queries'
import { isSessionError } from '@/features/auth/session-events'
import { resizeAvatar } from '@/features/profile/avatar'
import { profileQuery, useAvatar, useChangePassword, useUpdateProfile } from '@/features/profile/queries'
import { ApiError } from '@/shared/api/errors'
import { passwordChangeSchema, profileUpdateSchema, type Profile, type ProfileUpdate } from '@/shared/contracts'
import { focusFirstInvalid, zodFieldErrors } from '@/shared/forms'
import { announce } from '@/shared/ui/announcer'
import { FormField, TextField, inputClass } from '@/shared/ui/form-field'
import { Icon } from '@/shared/ui/icon'

type Draft = { displayName: string; username: string; email: string; ensLabel: string; walletNickname: string }
type Passwords = { currentPassword: string; newPassword: string; confirmPassword: string }

const EMPTY_PASSWORDS: Passwords = { currentPassword: '', newPassword: '', confirmPassword: '' }

const passwordFormSchema = passwordChangeSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirme a nova senha') })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })

const draftFrom = (profile: Profile): Draft => ({
  displayName: profile.displayName,
  username: profile.username,
  email: profile.email,
  ensLabel: profile.ensName?.replace(/\.eth$/, '') ?? '',
  walletNickname: profile.walletNickname ?? '',
})

/** Só os campos que mudaram, no formato do `PATCH /me/profile` (vazio vira `null` nos opcionais). */
function changesOf(draft: Draft, profile: Profile): Record<string, unknown> {
  const next = {
    displayName: draft.displayName.trim(),
    username: draft.username.trim(),
    email: draft.email.trim(),
    ensName: draft.ensLabel.trim() ? `${draft.ensLabel.trim().toLowerCase()}.eth` : null,
    walletNickname: draft.walletNickname.trim() || null,
  }
  return Object.fromEntries(Object.entries(next).filter(([key, value]) => value !== profile[key as keyof Profile]))
}

/** Mensagem da API para erros 4xx; falha de rede ou 5xx usa a genérica. */
function generalMessage(error: unknown, fallback: string) {
  return error instanceof ApiError && error.status && error.status < 500 ? error.message : fallback
}

export function ProfilePage() {
  const { user } = useCurrentUser()
  const profile = useQuery({ ...profileQuery(user?.id ?? ''), enabled: !!user })

  if (profile.isPending) return <ProfileSkeleton />
  if (profile.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-4 py-8">
        <p className="text-body text-fg">Não foi possível carregar seu perfil.</p>
        <Button variant="outline" onClick={() => profile.refetch()}>
          Tentar de novo
        </Button>
      </div>
    )
  }
  return <ProfileForm key={profile.data.userId} profile={profile.data} />
}

function ProfileForm({ profile }: { profile: Profile }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState(() => draftFrom(profile))
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const saving = updateProfile.isPending || changePassword.isPending

  const showErrors = (fields: Record<string, string>) => {
    setErrors(fields)
    focusFirstInvalid(formRef)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setErrors({})
    setFormError(null)

    // Valida tudo antes de enviar: dados (só o que mudou) e, se algum campo foi preenchido, a senha.
    const changes = changesOf(draft, profile)
    const wantsPassword = Object.values(passwords).some(Boolean)
    const parsedProfile = profileUpdateSchema.safeParse(changes)
    const parsedPassword = wantsPassword ? passwordFormSchema.safeParse(passwords) : null
    const fields = {
      ...(parsedProfile.success ? {} : zodFieldErrors(parsedProfile.error)),
      ...(parsedPassword && !parsedPassword.success ? zodFieldErrors(parsedPassword.error) : {}),
    }
    if (Object.keys(fields).length) return showErrors(fields)
    if (!Object.keys(changes).length && !wantsPassword) {
      announce('Nenhuma alteração para salvar')
      toast.info('Nenhuma alteração para salvar')
      return
    }

    const saved: string[] = []
    try {
      if (Object.keys(changes).length) {
        await updateProfile.mutateAsync(parsedProfile.data as ProfileUpdate)
        saved.push('Perfil atualizado')
      }
      if (parsedPassword?.success) {
        const { confirmPassword: _confirm, ...input } = parsedPassword.data
        await changePassword.mutateAsync(input)
        setPasswords(EMPTY_PASSWORDS)
        saved.push('Senha alterada')
      }
    } catch (error) {
      if (isSessionError(error)) return // o SessionWatcher leva ao login
      if (error instanceof ApiError && Object.keys(error.fields).length) showErrors(error.fields)
      setFormError(
        [saved.length ? `${saved.join('. ')}.` : '', generalMessage(error, 'Não foi possível salvar agora. Tente de novo.')]
          .filter(Boolean)
          .join(' '),
      )
      return
    }
    const message = `${saved.join('. ')}.`
    announce(message)
    toast.success(message)
  }

  const text = (field: keyof Draft) => ({
    name: field,
    value: draft[field],
    onChange: (event: { target: { value: string } }) => setDraft((current) => ({ ...current, [field]: event.target.value })),
    className: inputClass,
  })

  const password = (field: keyof Passwords) => ({
    name: field,
    value: passwords[field],
    onChange: (event: { target: { value: string } }) => setPasswords((current) => ({ ...current, [field]: event.target.value })),
    error: errors[field],
  })

  return (
    <form ref={formRef} noValidate onSubmit={submit} aria-labelledby="profile-title" className="flex flex-col gap-6">
      <h1 id="profile-title" className="text-tab font-bold text-fg">
        Perfil do colecionador
      </h1>
      {formError && (
        <p role="alert" className="rounded-[5px] border border-danger/60 bg-danger/10 px-3 py-2 text-caption text-fg">
          {formError}
        </p>
      )}

      <div className="grid gap-x-7 gap-y-5 lg:grid-cols-2">
        <FormField label="Nome de exibição" required error={errors.displayName}>
          {(a11y) => <input {...a11y} {...text('displayName')} autoComplete="name" />}
        </FormField>
        <FormField label="Nome de usuário" required error={errors.username}>
          {(a11y) => <input {...a11y} {...text('username')} autoComplete="username" />}
        </FormField>
        <FormField label="E-mail" required error={errors.email}>
          {(a11y) => <input {...a11y} {...text('email')} type="email" autoComplete="email" />}
        </FormField>
        <FormField label="Nome ENS (opcional)" error={errors.ensName}>
          {(a11y) => (
            <div className="flex items-stretch gap-2">
              <input {...a11y} {...text('ensLabel')} placeholder="seunome" autoComplete="off" className={`${inputClass} min-w-0 flex-1`} />
              <span aria-hidden="true" className="grid place-items-center rounded-[10px] border border-input px-3 text-body text-fg lg:rounded-[5px]">
                .eth
              </span>
            </div>
          )}
        </FormField>
        <FormField label="Apelido da carteira (opcional)" error={errors.walletNickname}>
          {(a11y) => <input {...a11y} {...text('walletNickname')} autoComplete="off" />}
        </FormField>
        <AvatarField profile={profile} />
      </div>

      <fieldset className="flex flex-col gap-4 lg:max-w-[417px]">
        <legend className="mb-4 text-tab font-bold text-fg">Alterar senha</legend>
        <TextField label="Senha atual" hideLabel={false} labelClassName="text-body text-fg" type="password" autoComplete="current-password" {...password('currentPassword')} />
        <TextField label="Nova senha" hideLabel={false} labelClassName="text-body text-fg" type="password" autoComplete="new-password" {...password('newPassword')} />
        <TextField label="Confirmar nova senha" hideLabel={false} labelClassName="text-body text-fg" type="password" autoComplete="new-password" {...password('confirmPassword')} />
        <p className="text-tiny text-fg-muted">Deixe em branco para manter a senha atual. Mínimo de 8 caracteres, com letra e número.</p>
      </fieldset>

      <Button type="submit" disabled={saving} className="h-12 w-full text-body font-bold lg:h-10 lg:w-[131px]">
        {saving ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  )
}

/** Avatar: alterar (redimensiona para 256 px e envia na hora) e remover. Não depende do "Salvar". */
function AvatarField({ profile }: { profile: Profile }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const avatar = useAvatar()
  const [error, setError] = useState<string | null>(null)

  const fail = (caught: unknown, fallback: string) => {
    if (isSessionError(caught)) return
    const message = caught instanceof ApiError ? (Object.values(caught.fields)[0] ?? generalMessage(caught, fallback)) : caught instanceof Error ? caught.message : fallback
    setError(message)
    announce(message)
  }

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    try {
      const dataUrl = await resizeAvatar(file)
      await avatar.upload.mutateAsync({ dataUrl })
      announce('Avatar atualizado')
      toast.success('Avatar atualizado')
    } catch (caught) {
      fail(caught, 'Não foi possível enviar a imagem. Tente de novo.')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = async () => {
    setError(null)
    try {
      await avatar.remove.mutateAsync()
      announce('Avatar removido')
      toast.success('Avatar removido')
    } catch (caught) {
      fail(caught, 'Não foi possível remover o avatar. Tente de novo.')
    }
  }

  return (
    <div role="group" aria-labelledby="avatar-label" aria-describedby={error ? 'avatar-error' : undefined} className="flex flex-col gap-1.5">
      <span id="avatar-label" className="text-body text-fg">
        Avatar
      </span>
      <div className="flex items-center gap-6" aria-busy={avatar.isPending || undefined}>
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt="Seu avatar" className="size-[50px] rounded-full object-cover" />
        ) : (
          <span className="grid size-[50px] place-items-center rounded-full border border-line bg-surface-raised text-fg-secondary">
            <Icon as={Image} size={22} />
            <span className="sr-only">Sem avatar</span>
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="avatar-input"
          onChange={(event) => void pick(event.target.files?.[0])}
        />
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={avatar.isPending} className="h-10 w-[98px] text-caption font-bold">
          {avatar.upload.isPending ? 'Enviando…' : 'Alterar'}
          <span className="sr-only"> avatar</span>
        </Button>
        <button
          type="button"
          onClick={() => void remove()}
          disabled={!profile.avatarUrl || avatar.isPending}
          className="text-caption text-fg hover:text-copper-text focus-visible:outline-2 focus-visible:outline-copper disabled:cursor-not-allowed disabled:opacity-50"
        >
          Remover<span className="sr-only"> avatar</span>
        </button>
      </div>
      {error && (
        <p id="avatar-error" className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando perfil">
      <div className="skeleton h-5 w-56" />
      <div className="grid gap-x-7 gap-y-5 lg:grid-cols-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-12 lg:h-10" />
          </div>
        ))}
      </div>
    </div>
  )
}
