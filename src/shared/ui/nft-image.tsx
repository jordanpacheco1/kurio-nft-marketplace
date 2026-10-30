import { cn } from 'cn'
import type { NftImage as NftImageName } from '@/shared/contracts'

const WIDTHS = [320, 640, 1024] as const

const srcSet = (image: NftImageName, format: 'avif' | 'webp') =>
  WIDTHS.map((w) => `/nfts/${image}-${w}.${format} ${w}w`).join(', ')

type Props = {
  image: NftImageName
  /** Valor do atributo `sizes`: quanto a imagem ocupa na tela. */
  sizes: string
  alt?: string
  priority?: boolean
  className?: string
}

/** `<picture>` com AVIF + WebP em 320/640/1024. Abaixo da dobra carrega sob demanda. */
export function NftImage({ image, sizes, alt = '', priority = false, className }: Props) {
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet(image, 'avif')} sizes={sizes} />
      <img
        src={`/nfts/${image}-640.webp`}
        srcSet={srcSet(image, 'webp')}
        sizes={sizes}
        width={640}
        height={640}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={cn('aspect-square w-full bg-surface-raised object-cover', className)}
      />
    </picture>
  )
}
