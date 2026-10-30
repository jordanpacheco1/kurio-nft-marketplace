import { useSyncExternalStore } from 'react'

/** Mesmo corte do prefixo `lg:` do Tailwind (layout desktop a partir de 1024 px). */
export const DESKTOP_QUERY = '(min-width: 1024px)'

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', notify)
      return () => list.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
