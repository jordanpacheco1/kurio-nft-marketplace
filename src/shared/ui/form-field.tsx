import { cn } from '@/lib/utils'
import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Hide, Show } from 'react-iconly'
import { Icon } from '@/shared/ui/icon'

export const inputClass =
  'h-12 w-full rounded-[10px] border border-input bg-transparent px-4 text-caption text-fg lg:h-10 lg:rounded-[5px] placeholder:text-fg-secondary/80 ' +
  'focus-visible:border-copper focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-copper ' +
  'aria-[invalid=true]:border-danger disabled:opacity-60'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string
  /** O Figma mostra só o placeholder; o label fica para leitores de tela. */
  hideLabel?: boolean
  error?: string
  /** Classe do label visível (padrão: o dos formulários de autenticação). */
  labelClassName?: string
}

/** Campo com label, erro ligado por `aria-describedby` e `aria-invalid`. */
export function TextField({ label, hideLabel = true, labelClassName = 'text-caption font-bold text-fg', error, className, type = 'text', ...props }: Props) {
  const id = useId()
  const errorId = `${id}-error`
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : labelClassName}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(inputClass, isPassword && 'pr-12')}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
            aria-pressed={visible}
            className="absolute inset-y-0 right-2 grid w-9 place-items-center text-fg-muted hover:text-copper-text focus-visible:outline-2 focus-visible:outline-copper"
          >
            <Icon as={visible ? Show : Hide} size={20} />
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

type FieldProps = {
  label: string
  required?: boolean
  error?: string
  hint?: string
  /** Label só para leitor de tela (o Figma mostra só o placeholder). */
  hideLabel?: boolean
  className?: string
  children: (props: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string; 'aria-required'?: true }) => ReactNode
}

/** Label visível com asterisco, dica e erro; o controle recebe os atributos de acessibilidade. */
export function FormField({ label, required, error, hint, hideLabel, className, children }: FieldProps) {
  const id = useId()
  const described = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ')
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-body text-fg'}>
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-danger">
            *
          </span>
        )}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': described || undefined,
        'aria-required': required ? true : undefined,
      })}
      {hint && (
        <p id={`${id}-hint`} className="text-tiny text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
