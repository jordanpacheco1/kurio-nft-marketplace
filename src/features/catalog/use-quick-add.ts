import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { nftDetailQuery } from '@/features/catalog/queries'
import { useAddToCart } from '@/features/cart/queries'
import type { NftSummary } from '@/shared/contracts'

/** Botão de carrinho do card: adiciona 1 unidade da primeira edição com estoque. */
export function useQuickAdd() {
  const queryClient = useQueryClient()
  const addToCart = useAddToCart()

  return {
    isPending: addToCart.isPending,
    add: async (nft: NftSummary) => {
      try {
        const detail = await queryClient.fetchQuery(nftDetailQuery(nft.id))
        const edition = detail.editions.find((item) => item.available > 0)
        if (!edition) {
          toast.error(`${nft.name} está esgotado.`)
          return
        }
        addToCart.mutate({ nftId: nft.id, editionId: edition.id, quantity: 1, name: nft.name })
      } catch {
        toast.error('Não foi possível adicionar ao carrinho. Tente de novo.')
      }
    },
  }
}
