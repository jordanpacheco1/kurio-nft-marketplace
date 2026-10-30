import type { RefObject } from 'react'
import type { z } from 'zod'

/** Primeira mensagem de cada campo, no formato de `fields` do envelope de erro da API. */
export function zodFieldErrors(error: z.ZodError) {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    fields[key] ??= issue.message
  }
  return fields
}

/** Depois do render com os erros, leva o foco ao primeiro campo inválido. */
export function focusFirstInvalid(form: RefObject<HTMLFormElement | null>) {
  requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
}

/** Valores de texto do formulário (FormData sem os `File`). */
export function formValues(form: HTMLFormElement) {
  const values: Record<string, string> = {}
  for (const [key, value] of new FormData(form)) if (typeof value === 'string') values[key] = value
  return values
}
