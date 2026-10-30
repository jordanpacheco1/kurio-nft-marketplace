import { useRef, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { useLogin, useRegister } from '@/features/auth/queries'
import { ApiError } from '@/shared/api/errors'
import { loginInputSchema, registerInputSchema } from '@/shared/contracts'
import { focusFirstInvalid, formValues, zodFieldErrors } from '@/shared/forms'
import { TextField } from '@/shared/ui/form-field'

const registerFormSchema = registerInputSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirme a senha') })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })

const submitClass = 'h-[60px] w-full rounded-[10px] text-body font-bold lg:h-[45px] lg:rounded-[5px]'

/** Erro geral do formulário, anunciado assim que aparece. */
function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-[5px] border border-danger/60 bg-danger/10 px-3 py-2 text-caption text-fg">
      {message}
    </p>
  )
}

/** Estado comum: erros por campo (do Zod ou da API) e erro geral. */
function useFormErrors() {
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const showFieldErrors = (fields: Record<string, string>) => {
    setErrors(fields)
    focusFirstInvalid(formRef)
  }

  const showApiError = (error: unknown, fallback: string) => {
    if (error instanceof ApiError && Object.keys(error.fields).length) {
      setFormError(error.message)
      showFieldErrors(error.fields)
    } else {
      setFormError(error instanceof ApiError && error.status && error.status < 500 ? error.message : fallback)
    }
  }

  const reset = () => {
    setErrors({})
    setFormError(null)
  }

  return { formRef, errors, formError, showFieldErrors, showApiError, reset }
}

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const login = useLogin()
  const { formRef, errors, formError, showFieldErrors, showApiError, reset } = useFormErrors()

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = loginInputSchema.safeParse(formValues(event.currentTarget))
    reset()
    if (!parsed.success) return showFieldErrors(zodFieldErrors(parsed.error))
    login.mutate(parsed.data, {
      onSuccess,
      onError: (error) => showApiError(error, 'Não foi possível entrar agora. Tente de novo.'),
    })
  }

  return (
    <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-3" aria-label="Entrar">
      <FormError message={formError} />
      <TextField label="E-mail" name="email" type="email" autoComplete="email" placeholder="contato@email.com" error={errors.email} />
      <TextField label="Senha" name="password" type="password" autoComplete="current-password" placeholder="Senha" error={errors.password} />
      <button
        type="button"
        disabled
        title="Em breve"
        className="self-end text-caption text-copper-text/70 disabled:cursor-not-allowed"
      >
        Esqueceu a senha? <span className="sr-only">(em breve)</span>
      </button>
      <Button type="submit" disabled={login.isPending} className={`${submitClass} mt-3`}>
        {login.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}

export function RegisterForm({ onSuccess, submitLabel }: { onSuccess: () => void; submitLabel: string }) {
  const register = useRegister()
  const { formRef, errors, formError, showFieldErrors, showApiError, reset } = useFormErrors()

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = registerFormSchema.safeParse(formValues(event.currentTarget))
    reset()
    if (!parsed.success) return showFieldErrors(zodFieldErrors(parsed.error))
    const { confirmPassword: _confirm, ...input } = parsed.data
    register.mutate(input, {
      onSuccess,
      onError: (error) => showApiError(error, 'Não foi possível criar a conta agora. Tente de novo.'),
    })
  }

  return (
    <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-3" aria-label="Criar conta">
      <FormError message={formError} />
      <TextField label="Nome de usuário" name="username" autoComplete="username" placeholder="Nome de usuário" error={errors.username} />
      <TextField label="E-mail" name="email" type="email" autoComplete="email" placeholder="Digite seu e-mail" error={errors.email} />
      <TextField label="Senha" name="password" type="password" autoComplete="new-password" placeholder="Senha" error={errors.password} />
      <TextField
        label="Confirmar senha"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        placeholder="Confirmar senha"
        error={errors.confirmPassword}
      />
      <Button type="submit" disabled={register.isPending} className={`${submitClass} mt-4`}>
        {register.isPending ? 'Criando…' : submitLabel}
      </Button>
    </form>
  )
}
