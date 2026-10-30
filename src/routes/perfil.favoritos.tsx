import { createFileRoute } from '@tanstack/react-router'
import { FavoritesPage } from '@/features/favorites/components/favorites-page'

export const Route = createFileRoute('/perfil/favoritos')({
  component: FavoritesPage,
})
