import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/queries'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { favoritesQuery } from '@/features/favorites/queries'

const gridClass = 'grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-3 lg:gap-x-5 lg:gap-y-10'

/** Lista de interesse: os favoritos do usuário (desfavoritar aqui tira o card da lista na hora). */
export function FavoritesPage() {
  const { user } = useCurrentUser()
  const favorites = useQuery({ ...favoritesQuery(user?.id ?? ''), enabled: !!user })

  return (
    <section aria-labelledby="favorites-title" className="flex flex-col gap-6">
      <h1 id="favorites-title" className="text-tab font-bold text-fg">
        Lista de interesse
      </h1>
      {!user || favorites.isPending ? (
        <div aria-busy="true" aria-label="Carregando favoritos" className={gridClass}>
          {Array.from({ length: 3 }, (_, index) => (
            <NftCardSkeleton key={index} />
          ))}
        </div>
      ) : favorites.isError ? (
        <div role="alert" className="flex flex-col items-start gap-4">
          <p className="text-body text-fg">Não foi possível carregar seus favoritos.</p>
          <Button variant="outline" onClick={() => favorites.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : favorites.data.items.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-body text-fg-secondary">Você ainda não favoritou nenhum NFT.</p>
          <Button asChild>
            <Link to="/" hash="catalogo">
              Explorar o mercado
            </Link>
          </Button>
        </div>
      ) : (
        <ul className={gridClass}>
          {favorites.data.items.map((nft) => (
            <li key={nft.id}>
              <NftCard nft={nft} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
