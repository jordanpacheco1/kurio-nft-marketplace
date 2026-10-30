## Correções feitas na Fase 8

| Antes | Depois | O que foi |
| --- | --- | --- |
| Chunk principal 828 kB (189 kB gzip) | 344 kB (108 kB gzip) | `react-iconly` pelo build ESM fatiado (alias no `vite.config.ts`) |
| CLS 0,22 no detalhe desktop | 0,005 | Skeleton do detalhe reserva a altura das abas e de "Mais desta coleção" |
| SEO 92 | 100 | `public/robots.txt` (a rota caía no rewrite de SPA e devolvia HTML) |
| A11y 96 na home desktop | 100 | `cn` configurado com a escala de texto do tema; o "Aplicar" tinha contraste 2,5:1 |

## Abaixo da meta: performance mobile (70–75)

O desktop fica em 98. No mobile o Lighthouse simula 4G lento (~1,6 Mbps, 150 ms de RTT) e CPU 4× mais lenta,
e o gargalo é o FCP de ~3,7 s:

- é uma SPA sem SSR. Nada é pintado antes de baixar e executar o chunk principal (108 kB gzip: React 19,
  TanStack Router/Query, o menu do Radix e o shell), mais o CSS e as fontes. Só a transferência desse chunk custa
  ~0,6 s nessa rede, e o parse/execução com a CPU 4× leva o resto;
- o LCP (4,7–5,4 s) é a imagem do hero, que já vem pré-carregada no `index.html` (`fetchpriority="high"`) e
  não depende dos mocks. Ela só aparece depois do primeiro render do React;
- o MSW (~170 kB gzip) e o `socket.io-client` já estão fora do caminho crítico (imports dinâmicos), e o TBT
  ficou baixo (90–140 ms).

Próximos passos, se houvesse mais tempo (nenhum é barato):

1. pré-renderizar o shell e o hero da home no `index.html` (SSG com o TanStack Start ou um script de
   prerender), para o FCP/LCP saírem antes do JS;
2. carregar o `DropdownMenu` do header (Radix + floating-ui, ~150 kB de código-fonte) só no clique, e o chunk
   `contracts` (Zod) só nas rotas que validam formulários (`zod/mini` nos search params);
3. subset das fontes só com latin e `preload` da Roboto Mono usada acima da dobra.
