import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { NftImage as NftImageName } from '@/shared/contracts'
import { NftImage } from '@/shared/ui/nft-image'

/** Imagem ampliada num dialog. O gatilho é o botão de lupa de quem usa. */
export function ZoomDialog({ image, name, trigger }: { image: NftImageName; name: string; trigger: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-[min(90vw,720px)] gap-3 bg-surface p-4 sm:max-w-[min(90vw,720px)]">
        <DialogTitle className="text-body">{name}</DialogTitle>
        <DialogDescription className="sr-only">Imagem ampliada</DialogDescription>
        <NftImage image={image} sizes="(min-width: 768px) 720px, 90vw" alt={name} className="rounded-xl" />
      </DialogContent>
    </Dialog>
  )
}
