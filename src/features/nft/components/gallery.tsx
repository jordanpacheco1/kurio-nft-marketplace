import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Search } from 'react-iconly'
import type { NftDetail } from '@/shared/contracts'
import { Icon } from '@/shared/ui/icon'
import { NftImage } from '@/shared/ui/nft-image'
import { ZoomDialog } from '@/shared/ui/zoom-dialog'

/** Galeria do desktop: miniaturas à esquerda, imagem principal com lupa. */
export function Gallery({ nft }: { nft: NftDetail }) {
  const [current, setCurrent] = useState(0)
  const image = nft.gallery[current] ?? nft.image

  return (
    <div className="flex gap-6">
      <ul aria-label="Imagens do NFT" className="flex w-[100px] shrink-0 flex-col gap-4">
        {nft.gallery.slice(0, 4).map((item, index) => (
          <li key={`${item}-${index}`}>
            <button
              type="button"
              aria-label={`Ver imagem ${index + 1} de ${Math.min(nft.gallery.length, 4)}`}
              aria-pressed={index === current}
              onClick={() => setCurrent(index)}
              className={cn(
                'block overflow-hidden rounded-sm border-2 border-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper',
                index === current && 'border-copper',
              )}
            >
              <NftImage image={item} sizes="100px" priority={index === 0} />
            </button>
          </li>
        ))}
      </ul>
      <div className="relative flex-1 rounded-sm bg-surface p-5">
        <NftImage image={image} sizes="400px" priority alt={nft.name} className="rounded-xl" />
        <ZoomDialog
          image={image}
          name={nft.name}
          trigger={
            <button
              type="button"
              aria-label="Ampliar imagem"
              className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-ink/85 text-fg hover:bg-copper hover:text-ink focus-visible:outline-2 focus-visible:outline-copper"
            >
              <Icon as={Search} size={20} />
            </button>
          }
        />
      </div>
    </div>
  )
}
