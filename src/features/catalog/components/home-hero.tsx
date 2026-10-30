import { ArrowRight } from 'react-iconly'
import { Icon } from '@/shared/ui/icon'
import { NftImage } from '@/shared/ui/nft-image'

// Conteúdo editorial estático: o LCP não depende do boot dos mocks (a imagem é pré-carregada no index.html).
// O carrossel do Figma virou um slide só (corte de 30/10); os pontos ficam como decoração.
function Dots() {
  return (
    <span aria-hidden="true" className="flex gap-1.5">
      <span className="size-1.5 rounded-full bg-copper" />
      <span className="size-1.5 rounded-full bg-copper/60" />
      <span className="size-1.5 rounded-full bg-copper/60" />
    </span>
  )
}

export function HomeHero() {
  return (
    <>
      {/* Desktop */}
      <section aria-labelledby="hero-title" className="hidden items-center justify-between gap-10 py-8 lg:flex">
        <div className="flex max-w-[560px] flex-col gap-4 pl-10">
          <p className="text-xs text-fg">Bem-vindo à Kurio</p>
          <h1 id="hero-title" className="text-display font-bold tracking-wide text-fg uppercase">
            Seja dono do futuro da arte digital
          </h1>
          <p className="max-w-[540px] text-xs leading-6 text-fg-secondary">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas
            e tenha uma parte da cultura da internet.
          </p>
          <div className="mt-4 flex items-end justify-between">
            <a
              href="#catalogo"
              className="rounded-sm bg-copper px-7 py-2.5 text-xs font-bold text-ink uppercase hover:bg-copper-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper"
            >
              Explorar
            </a>
            <span className="mr-[-120px]">
              <Dots />
            </span>
          </div>
        </div>
        <div className="w-[450px] shrink-0 overflow-hidden rounded-xl">
          <NftImage image="ape-emerald" sizes="450px" priority alt="Emerald Ape #042, macaco de óculos e jaqueta verde" />
        </div>
      </section>

      {/* Mobile */}
      <section
        aria-labelledby="hero-title-mobile"
        className="relative flex gap-3 overflow-hidden rounded-[22px] bg-card-gradient p-4 shadow-float lg:hidden"
      >
        <span aria-hidden="true" className="absolute -top-16 -left-10 size-56 rounded-full bg-surface-raised/60" />
        <div className="relative flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-xs font-bold text-fg">Bem-vindo à Kurio</p>
          <h1 id="hero-title-mobile" className="text-lg leading-7 font-bold text-fg uppercase min-[400px]:text-xl">
            Seja dono da cultura digital
          </h1>
          <p className="text-xs leading-5 text-fg-secondary">Descubra NFTs selecionados de criadores do mundo todo.</p>
          <a href="#catalogo" className="flex w-fit items-center gap-2 text-xs font-bold text-copper-text uppercase">
            Explorar <Icon as={ArrowRight} size={16} />
          </a>
        </div>
        <div className="relative w-[42%] max-w-[160px] shrink-0 self-center">
          <NftImage image="ape-emerald" sizes="160px" priority className="rounded-xl" />
          <div className="absolute -bottom-1 -left-3 w-[48%] rounded-lg border-2 border-surface">
            <NftImage image="ape-nomad" sizes="80px" className="rounded-md" />
          </div>
        </div>
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <Dots />
        </span>
      </section>
    </>
  )
}
