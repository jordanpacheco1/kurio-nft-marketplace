import { Link } from '@tanstack/react-router'
import type { Collection } from '@/shared/contracts'

const features = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

// Itens sem tela neste desafio: ficam desabilitados com "Em breve" (docs/figma-notes.md).
const soonColumns = [
  { title: 'Meu perfil', items: ['Meu perfil', 'Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'] },
  { title: 'Central de ajuda', items: ['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'] },
]

const collections: [Collection, string][] = [
  ['arte-digital', 'Arte digital'],
  ['fotografia', 'Fotografia'],
  ['musica', 'Música'],
  ['arte-3d', 'Arte 3D'],
  ['utilidade', 'Utilidade'],
]

const socials = [
  { label: 'Facebook', glyph: 'f' },
  { label: 'Instagram', glyph: '◎' },
  { label: 'X (Twitter)', glyph: '𝕏' },
  { label: 'LinkedIn', glyph: 'in' },
  { label: 'YouTube', glyph: '▶' },
]

function Soon({ children }: { children: string }) {
  return (
    <span aria-disabled="true" title="Em breve" className="cursor-not-allowed">
      {children}
      <span className="sr-only"> (em breve)</span>
    </span>
  )
}

export function SiteFooter() {
  return (
    <footer className="page-container mt-16 lg:mt-24">
      <div className="rounded-t-sm bg-surface">
        <div className="grid gap-8 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:px-10">
          {features.map((feature) => (
            <div key={feature.letter} className="flex flex-col gap-3 lg:border-r lg:border-copper/60 lg:px-6 lg:first:pl-0">
              <span aria-hidden="true" className="grid size-[52px] place-items-center rounded-full bg-copper text-lg font-bold text-ink">
                {feature.letter}
              </span>
              <h2 className="text-sm font-bold text-fg">{feature.title}</h2>
              <p className="text-xs leading-5 text-fg-secondary">{feature.text}</p>
            </div>
          ))}
          <div className="flex flex-col gap-3 lg:pl-6">
            <h2 className="text-sm font-bold text-fg">Antecipe-se ao próximo lançamento</h2>
            <div className="flex">
              <label htmlFor="newsletter" className="sr-only">
                E-mail para a newsletter
              </label>
              <input
                id="newsletter"
                type="email"
                disabled
                placeholder="digite seu e-mail..."
                className="h-9 min-w-0 flex-1 rounded-l-sm bg-surface-raised px-3 text-xs text-fg placeholder:text-fg-muted disabled:cursor-not-allowed"
              />
              <button type="button" disabled title="Em breve" className="rounded-r-sm bg-copper px-3 text-sm font-bold text-ink disabled:cursor-not-allowed disabled:opacity-70">
                Enviar
              </button>
            </div>
            <p className="text-xs leading-5 text-fg-secondary">
              Receba lançamentos selecionados, histórias de criadores e novidades do mercado.{' '}
              <span className="text-fg-muted">(Newsletter em breve.)</span>
            </p>
          </div>
        </div>

        <div className="grid gap-3 bg-band px-6 py-5 text-xs text-fg sm:grid-cols-2 lg:grid-cols-4 lg:items-center lg:px-10">
          <span className="font-bold tracking-widest">KURIO</span>
          <span>Feito para colecionadores, criadores e cultura</span>
          <span>contato@email.com</span>
          <span>+55 11 4002 8922</span>
        </div>

        <div className="grid grid-cols-2 gap-8 px-6 py-8 text-xs text-fg-secondary lg:grid-cols-4 lg:px-10">
          {soonColumns.map((column) => (
            <div key={column.title} className="flex flex-col gap-2.5">
              <h2 className="text-sm font-bold text-fg">{column.title}</h2>
              <ul className="flex flex-col gap-2.5">
                {column.items.map((item) => (
                  <li key={item}>
                    <Soon>{item}</Soon>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex flex-col gap-2.5">
            <h2 className="text-sm font-bold text-fg">Coleções</h2>
            <ul className="flex flex-col gap-2.5">
              {collections.map(([id, label]) => (
                <li key={id}>
                  <Link to="/" search={{ collections: [id] }} hash="catalogo" className="hover:text-copper-text">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
            <h2 className="text-sm font-bold text-fg">Redes sociais</h2>
            <ul className="flex gap-2">
              {socials.map((social) => (
                <li key={social.label}>
                  <span
                    aria-disabled="true"
                    title={`${social.label} (em breve)`}
                    className="grid size-7 cursor-not-allowed place-items-center rounded-sm border border-copper text-xs font-bold text-copper-text"
                  >
                    <span aria-hidden="true">{social.glyph}</span>
                    <span className="sr-only">{social.label} (em breve)</span>
                  </span>
                </li>
              ))}
            </ul>
            <h2 className="mt-2 text-sm font-bold text-fg">Carteiras compatíveis</h2>
            <p className="w-fit rounded-sm border border-copper/60 bg-band px-2 py-1 text-tiny font-bold text-copper-text">
              METAMASK · WALLETCONNECT · COINBASE
            </p>
          </div>
        </div>
      </div>
      <p className="py-4 text-center text-tiny text-fg-secondary">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
