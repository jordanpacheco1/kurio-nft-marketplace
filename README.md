# Kurio

Marketplace de NFTs do [desafio frontend da Jungle Gaming](docs/CHALLENGE.md): catálogo, detalhe, carrinho,
pagamento, confirmação, login, cadastro, perfil e carteiras, em desktop e mobile. Toda a API é simulada no
navegador com MSW (REST e Socket.IO), inclusive no build publicado.

- **Demo:** https://kurio-nft-marketplace-sooty-mu.vercel.app
- **Arquitetura e decisões:** [`ARCHITECTURE.md`](ARCHITECTURE.md)
- **Contratos REST, eventos e cenários:** [`docs/API.md`](docs/API.md)
- **Lighthouse:** [`lighthouse/SUMMARY.md`](lighthouse/SUMMARY.md)

React 19 · TypeScript (strict) · Vite · TanStack Router · TanStack Query · Axios · socket.io-client ·
Tailwind 4 · shadcn/ui · Zod · MSW 2 + `@mswjs/socket.io-binding` · Playwright · Lighthouse CI.

## Setup

Requisitos: **Node 22+** e npm. Funciona em Windows, macOS e Linux.

```bash
git clone https://github.com/jordanpacheco1/kurio-nft-marketplace.git
cd kurio-nft-marketplace
npm ci
npx playwright install chromium   # só para os testes E2E
npm run dev                       # http://localhost:5173
```

### Variáveis de ambiente

Ficam no `.env`, versionado (não há segredos). A Vercel não precisa de configuração.

| Variável | Valor | Para quê |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Liga o MSW (REST + Socket.IO). Com `false`, o app chama `/api` e o socket de verdade |
| `VITE_SOCKET_URL` | `wss://realtime.kurio.test` | Origem do Socket.IO, interceptada pelo MSW |

### Credenciais

| E-mail | Senha | O que tem |
| --- | --- | --- |
| `colecionador@kurio.test` | `Kurio@2026` | Perfil completo, carteira principal (`0xA91F…E82C`, Ethereum) e secundária (`nova.kurio.eth`, Polygon), favoritos |
| `curadora@kurio.test` | `Kurio@2026` | Sem carteiras (bom para testar o cadastro de carteira) |

Também dá para criar uma conta em `/cadastro`. Cupons: `KURIO10` (10%), `GENESIS5` (5%) e `EXPIRADO` (sempre
expirado); qualquer outro é inválido.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento (porta 5173) |
| `npm run build` | Typecheck + build de produção em `dist/` |
| `npm run preview` | Serve o `dist/` (porta 4173) |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | ESLint |
| `npm test` | Vitest (aritmética de ETH em `src/shared/money/`) |
| `npm run test:e2e` | Playwright: build + preview e todos os E2E, nos projetos `desktop` (1440×900) e `mobile` (390×844) |
| `npm run test:e2e:update` | Igual, regenerando snapshots |
| `npm run test:visual` | Regressão visual no Docker (imagem oficial do Playwright) |
| `npm run test:visual:update` | Regenera as baselines visuais no Docker |
| `npm run lighthouse` | Build + Lighthouse mobile e desktop (3 rodadas por página) e grava `lighthouse/SUMMARY.md` |

- **E2E contra o deploy:** `BASE_URL=https://kurio-nft-marketplace-sooty-mu.vercel.app npx playwright test`
  (no PowerShell: `$env:BASE_URL='https://…'; npx playwright test`).
- Relatório HTML: `npx playwright show-report`. Os traces ficam guardados só nas falhas.
- Se um `vite preview` antigo estiver aberto na porta 4173, o Playwright o reaproveita: feche-o ou rode
  `npm run build` antes, senão os testes rodam no build velho.

## Cenários e reset

A API simulada tem cenários que mudam a rede e as regras de negócio. Três formas de escolher:

1. **URL:** `?scenario=<id>` (e `?seed=<n>`, opcional), por exemplo `/?scenario=slow`;
2. **Painel "Cenários":** botão flutuante no canto da tela (some com `?devtools=off`);
3. **Console:** `window.__kurio.setScenario('flaky')`.

A escolha fica no `localStorage`. **Reset:** o botão "Resetar dados" do painel volta o banco à seed, limpa a
sessão, o carrinho de visitante e o pedido pendente do app e recarrega em `/`. `window.__kurio.reset()` faz só a
parte do "servidor" (banco, sessões, pedidos) e derruba os sockets, que reconectam e reconciliam com o REST.
Limpar o `localStorage` do site também zera tudo.

| Cenário | O que simula |
| --- | --- |
| `default` | Latência de 50–150 ms; o pagamento confirma em ~2 s |
| `slow` | Latência de 1,5–3 s (skeletons) |
| `flaky` | 30% das respostas com 503 + `Retry-After`, sorteadas pela seed |
| `offline` | Toda requisição falha na conexão |
| `out-of-order` | Buscas mais curtas demoram mais (respostas fora de ordem) |
| `empty` | Catálogo vazio |
| `session-expired` | A sessão dura 30 s depois do login |
| `price-change` | O preço de um item do carrinho sobe logo depois da primeira cotação |
| `sold-out` | Uma edição do carrinho esgota ao confirmar a compra |
| `order-timeout` | O pedido é criado, mas a resposta demora mais que o timeout do cliente (10 s) |
| `payment-declined` | O pagamento é recusado |
| `wallet-rejected` | A carteira recusa a conexão |

Helpers do console (`window.__kurio`, só com os mocks ligados): `emitNftUpdate(nftId, { editionId?, priceEth?, available? })`,
`emitDuplicates(nftId, change)`, `dropSocket(ms)`, `expireSession()`, `setLatency(ms)`, `failNext(method, regex, code?)`.
Todos passam pelo banco do mock e pelo `socket.io-client`, como um backend de verdade. Detalhes em [`docs/API.md`](docs/API.md).

## Como reproduzir cada falha

Os comandos de console rodam no DevTools da página aberta. Os NFTs citados existem na seed
(`emerald-ape-042`, `violet-nomad-314`…).

| Falha | Como reproduzir | O que esperar |
| --- | --- | --- |
| Rede lenta | `/?scenario=slow` | Skeletons do mesmo tamanho do conteúdo; "Atualizando resultados…" ao filtrar |
| Erro intermitente | `/?scenario=flaky` | Queries tentam de novo até 2× em 5xx; o que ainda falhar mostra "Tentar de novo" |
| Sem conexão | `/?scenario=offline` | Telas de erro com "Tentar de novo"; volte a `default` e clique para recuperar |
| Respostas fora de ordem | `/?scenario=out-of-order` e digite rápido na busca | A lista sempre corresponde ao último termo (requisições obsoletas são canceladas) |
| Catálogo vazio | `/?scenario=empty` | Estado vazio com "Limpar filtros"; detalhe vira 404 |
| Sessão expirada | Logado, `__kurio.expireSession()` e navegue (ou cenário `session-expired`) | Vai para `/login?reason=expired` e volta à mesma tela depois; no checkout o rascunho é restaurado |
| Preço mudou | `price-change`, carrinho com itens, abra `/checkout` | Aviso do que mudou, compra travada até "Aceitar novos valores" |
| Preço mudou em tempo real | Com o NFT no carrinho: `__kurio.emitNftUpdate('emerald-ape-042', { priceEth: '2.5' })` | Aviso "O preço de X mudou de A para B" no carrinho; cotação refeita no checkout |
| Esgotou | `sold-out` e confirme a compra (ou `emitNftUpdate(id, { available: 0 })`) | Compra travada com "Ajustar o carrinho"; carrinho intacto |
| Timeout do pedido | `order-timeout` e pague | Após 10 s o cliente reenvia com a mesma `Idempotency-Key` e recebe o mesmo pedido: uma compra só |
| Duplo clique | Clique duas vezes em "Pagar" | Botão travado; uma compra só |
| Pagamento recusado | `payment-declined` e pague | Dialog "Pagamento recusado" com "Tentar de novo"; carrinho intacto |
| Carteira recusada | `wallet-rejected` e conecte a carteira no checkout | Erro na conexão; a compra exige carteira conectada |
| Queda do socket | `__kurio.dropSocket(5000)` | Reconecta sozinho e invalida catálogo, detalhe, carrinho, cotação e pedido pendente (REST reconcilia) |
| Eventos duplicados | `__kurio.emitDuplicates('emerald-ape-042', { priceEth: '3' })` | Um anúncio só, e o preço não volta ao valor antigo (dedupe por `eventId` + versão) |
| Pedido pendente + refresh | Pague e recarregue a página durante o "Processando" | O app retoma pelo `GET /orders/:id` e mostra o resultado |
| Dados entre usuários | Logue como colecionador, saia, entre como curadora | Favoritos, carrinho, perfil e eventos de pedido do primeiro usuário não aparecem |
| Conflito de cadastro | Cadastre com `colecionador@kurio.test` | 409 com o erro no campo de e-mail |
| Cupom | `EXPIRADO` ou qualquer código desconhecido no carrinho | Erro no próprio campo |

Quase todas as linhas têm um teste E2E em `e2e/` (`catalog`, `auth`, `cart`, `checkout` e `profile`).

## Testes

- **E2E** (`e2e/*.spec.ts`): fluxos dos 12 cenários do enunciado nos dois layouts, contrato de cada endpoint
  (`api-contract.spec.ts`, só no desktop) e acessibilidade por teclado (`a11y.spec.ts`). Cada teste parte de um
  contexto novo, com o banco da seed. Eventos são disparados pelo `window.__kurio` e chegam pelo `socket.io-client`.
- **Unitários:** `npm test` (Vitest) para a aritmética de ETH em wei.

### Regressão visual

`e2e/visual.spec.ts` compara início, detalhe, carrinho e pagamento, em desktop e mobile, com as baselines
versionadas em `e2e/visual.spec.ts-snapshots/`. Os dados são estáveis: banco da seed padrão (2026), latência
zero, relógio fixo, `reducedMotion: 'reduce'` e `animations: 'disabled'`.

As baselines foram geradas no **Linux**, na imagem `mcr.microsoft.com/playwright:v<versão>-noble` (a versão
sai do `@playwright/test` instalado). A renderização de fontes muda entre sistemas, então:

- no Linux (CI, por exemplo), `npm run test:e2e` já roda o visual junto;
- no Windows e no macOS o visual é pulado no `test:e2e`. Use `npm run test:visual`, que precisa do Docker.
  O script monta o projeto em `/work` e usa um volume próprio para o `node_modules` do Linux;
- para comparar sem Docker, com baselines locais: `VISUAL=1 npx playwright test e2e/visual.spec.ts --update-snapshots`
  gera arquivos `*-win32.png`/`*-darwin.png` (não versione esses).

Depois de uma mudança visual intencional, rode `npm run test:visual:update` e confira o diff das imagens no commit.

### Lighthouse

`npm run lighthouse` faz o build, sobe o `vite preview` e roda o Lighthouse (via `@lhci/cli`) 3 vezes em `/` e
em `/nft/emerald-ape-042`, nos perfis mobile (`lighthouserc.mobile.json`) e desktop (`lighthouserc.desktop.json`).
O script `scripts/lighthouse.mjs` calcula a mediana de cada categoria e de FCP, LCP, TBT e CLS e grava
`lighthouse/SUMMARY.md` com as versões e o ambiente (as justificativas ficam em `lighthouse/NOTES.md`, anexado
ao resumo). Precisa do Google Chrome instalado. `npm run lighthouse -- mobile` roda só um perfil.

## Estrutura

```
src/
  app/          boot (mocksReady), providers, queryClient, router
  routes/       rotas do TanStack Router (uma por arquivo)
  features/     catalog, nft, cart, checkout, orders, auth, profile, wallets, favorites
  shared/       contracts (Zod), api (Axios), realtime (socket + processador), money, ui
  mocks/        db (seed + localStorage), handlers REST, realtime (Socket.IO), scenarios, devtools
e2e/            Playwright (E2E, contrato, a11y e visual)
docs/           enunciado, API, notas do Figma, plano e progresso
```
