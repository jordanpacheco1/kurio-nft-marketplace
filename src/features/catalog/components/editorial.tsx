import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'react-iconly'
import type { HomeSearch } from '@/features/catalog/search'
import type { NftImage as NftImageName } from '@/shared/contracts'
import { Icon } from '@/shared/ui/icon'
import { NftImage } from '@/shared/ui/nft-image'

// Conteúdo editorial estático da home: os dois cards promocionais e o "Diário da Cunhagem".

const promos: { title: string; text: string; image: NftImageName; search: Partial<HomeSearch> }[] = [
  {
    title: 'Lançamentos gênesis de edição limitada',
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: 'ape-emerald',
    search: { tab: 'new' },
  },
  {
    title: 'Arte digital selecionada e muito mais',
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    image: 'ape-ivory',
    search: { collections: ['arte-digital'] },
  },
]

export function PromoCards() {
  return (
    <section aria-label="Destaques editoriais" className="grid gap-4 lg:grid-cols-2 lg:gap-8">
      {promos.map((promo) => (
        <article key={promo.title} className="flex overflow-hidden rounded-sm bg-surface">
          <div className="w-[38%] shrink-0 lg:w-[48%]">
            <NftImage image={promo.image} sizes="(min-width: 1024px) 285px, 38vw" className="h-full" />
          </div>
          <div className="flex flex-col items-end justify-center gap-2 p-4 text-right">
            <h2 className="text-sm font-bold text-fg lg:text-base">{promo.title}</h2>
            <p className="text-xs leading-5 text-fg-secondary">{promo.text}</p>
            <Link
              to="/"
              search={(prev) => ({ ...prev, page: 1, ...promo.search })}
              hash="catalogo"
              className="mt-1 flex items-center gap-1 rounded-sm bg-copper px-4 py-2 text-xs font-bold text-ink hover:bg-copper-dark"
            >
              Explorar <Icon as={ArrowRight} size={14} />
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}

const posts: { date: string; read: string; title: string; text: string; image: NftImageName }[] = [
  {
    date: '12 de setembro',
    read: 'Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: 'ape-ivory',
  },
  {
    date: '13 de setembro',
    read: 'Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a cultura digital.',
    image: 'ape-emerald',
  },
  {
    date: '15 de setembro',
    read: 'Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: 'ape-nomad',
  },
  {
    date: '15 de setembro',
    read: 'Leitura de 2 min',
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: 'ape-golden',
  },
]

export function MintJournal() {
  return (
    <section aria-labelledby="journal-title" className="flex flex-col gap-6">
      <header className="text-center">
        <h2 id="journal-title" className="font-inter text-heading text-fg">
          Diário da Cunhagem
        </h2>
        <p className="mt-2 text-xs text-fg-secondary">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </header>
      <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-[repeat(4,268px)] lg:gap-[22px]">
        {posts.map((post) => (
          <li key={post.title} className="flex flex-col overflow-hidden rounded-sm bg-surface">
            <NftImage image={post.image} sizes="(min-width: 1024px) 268px, 50vw" className="aspect-[268/195]" />
            <div className="flex flex-1 flex-col gap-2 p-4">
              <p className="text-tiny leading-4 text-fg-secondary">
                {post.date} <span aria-hidden="true">|</span> {post.read}
              </p>
              <h3 className="font-inter text-sm text-fg">{post.title}</h3>
              <p className="text-tiny leading-4 text-fg-secondary">{post.text}</p>
              <span
                aria-disabled="true"
                title="Em breve"
                className="mt-auto cursor-not-allowed font-inter text-tiny text-copper-text"
              >
                Ler mais → <span className="sr-only">(em breve)</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
