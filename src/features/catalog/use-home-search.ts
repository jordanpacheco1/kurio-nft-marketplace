import { useNavigate, useSearch } from '@tanstack/react-router'
import type { HomeSearch } from '@/features/catalog/search'

/**
 * Lê e muda os search params da home. Qualquer mudança de filtro volta para a página 1
 * (só a paginação passa `page`). `replace` serve para a busca digitada não encher o histórico.
 */
export function useHomeSearch() {
  const search = useSearch({ from: '/' })
  const navigate = useNavigate()

  const update = (patch: Partial<HomeSearch>, options: { replace?: boolean } = {}) =>
    navigate({
      to: '/',
      search: (prev) => ({ ...prev, page: 1, ...patch }),
      replace: options.replace,
      resetScroll: false,
    })

  return { search, update }
}
