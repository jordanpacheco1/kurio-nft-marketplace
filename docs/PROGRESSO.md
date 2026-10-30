# Progresso — Kurio

Registro por fase. Uma sessão nova começa lendo este arquivo e o `docs/PLANO.md`.

## Contexto

- 30/10: o recrutador já tinha dito na call que **pode usar IA** e que **o prazo é fixo** (sáb 31/10, ~12h).
  Nenhum e-mail foi mandado.
- 30/10: começamos um dia atrasado. O `PLANO.md` foi refeito para terminar sáb 11h30 (pausa de 0h30 a 6h)
  e recebeu cortes: só dois layouts (mobile abaixo de 1024 px), carrosséis viram linha estática de cards,
  conflito de cadastro e cupom inválido/expirado viram regras fixas do mock, e queda do socket e eventos
  duplicados ficam só nos helpers `dropSocket` e `emitDuplicates` do `window.__kurio` (Fase 2).
  O header, o footer e o grid da Fase 1 já usam o corte `lg:`.

## Fase 1 — Fundação e risco técnico

**Status:** concluída em 30/10. Deploy: https://kurio-nft-marketplace-sooty-mu.vercel.app

### Feito

- Scaffold manual (a pasta já tinha arquivos): Vite 8, React 19, TypeScript 6 strict, Tailwind 4.3 com
  `src/styles/theme.css` intacto, shadcn (`components.json` escrito à mão, `button` e `sonner`), fontes
  self-hosted e ESLint 10 (flat config).
- Scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `test:e2e`, `test:e2e:update`, `lighthouse`.
- Router com rotas em arquivo e `autoCodeSplitting`; layout raiz com header e footer simplificados; 404 via
  `notFoundComponent`.
- MSW: `src/app/boot.ts` exporta `mocksReady`; o render não espera por ela, só o interceptor do Axios e o
  socket. `GET /api/nfts` mínimo (4 NFTs). Socket com o código de referência do plano (ping do Engine.IO,
  `transports: ['websocket']`, import dinâmico).
- Tempo real: `src/shared/realtime/` com o processador (dedupe por `eventId` + versão por recurso), o vínculo
  com o cache (`setQueriesData` nas listas e invalidação ao reconectar) e anúncio numa região `aria-live`.
- `window.__kurio`: `emitNftUpdate` (grava no "banco" e emite) e `connectedClients` (os testes esperam o
  socket conectar antes de emitir).
- Playwright: projetos `desktop` (1440×900) e `mobile` (390×844), Chromium, trace `retain-on-failure`,
  relatório HTML. Sobe `build + preview` local; com `BASE_URL` roda contra a URL publicada.
  Smoke (3 testes × 2 projetos): catálogo do mock, 404 e `nft.updated` chegando na interface. **6/6 passando.**
- `vercel.json`: rewrite de SPA para tudo exceto `/api/*`.

### Lighthouse (rodada rápida, Fase 1)

Lighthouse 12.6.1, mobile (emulação padrão), `vite preview` local, 1 rodada, home com 4 NFTs:

| Perf | A11y | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 85 | 100 | 100 | 92 | 2,9 s | 3,6 s | 50 ms | 0 |

Custo do boot: o chunk do MSW (`browser-*.js`) tem ~163 kB gzip, mas sai do caminho crítico (import
dinâmico). O chunk principal tem ~173 kB gzip (React, Router, Query, Axios, Zod 4, sonner); dá para
olhar na Fase 8 (ex.: `zod/mini`). O LCP hoje é a imagem do primeiro card, que depende do mock; com o hero
estático pré-carregado da Fase 3 ele deve cair.

### Decisões e desvios

- `components.json` escrito à mão em vez de `shadcn init`, para não arriscar o `theme.css`.
- Removido o `next-themes` que o shadcn instala com o `sonner`: o layout só tem modo escuro.
- `lucide-react` instalado porque os componentes do shadcn dependem dele; os ícones do app seguem com
  `react-iconly`.
- `baseUrl` fora dos tsconfigs: o TypeScript 6 o deprecou; `paths` funciona sem ele.
- Timeout de 10 s do Axios (AbortController) e envelope de erro ficaram para a Fase 2, junto com os interceptors.

### Pendências

- [x] Repositório importado na Vercel (deploy automático a cada push no `main`).
- [x] Smoke contra a URL pública: 6/6 (`BASE_URL=https://kurio-nft-marketplace-sooty-mu.vercel.app npm run test:e2e`).
- [x] Refresh em rota interna devolve o `index.html` (200); `/api/nfts` fora do mock dá 404, como previsto.
- Fase 2 concluída (abaixo).

## Fase 2 — Contratos e backend simulado

**Status:** concluída em 30/10. Referência completa dos contratos, eventos e cenários: `docs/API.md`.

### Feito

- **Contratos** (`src/shared/contracts/`, sem alias `@/` para os testes importarem): sessão, perfil,
  carteiras, NFTs (lista com facetas, detalhe, destaques, relacionados), favoritos, carrinho, cotação,
  pedido com recibo, envelope de erro (com `fields` e `quote`) e eventos `nft.updated` / `order.updated`.
- **Money** (`src/shared/money/`): string decimal ↔ wei (bigint), soma, subtração (limitada a zero),
  multiplicação por inteiro, percentual (arredonda para baixo no wei) e `formatEth` (2 a 4 casas,
  meio para cima). Vitest com 14 testes (`npm test`).
- **Banco do mock** (`src/mocks/db/`): seed determinística (42 NFTs, 2 usuários, carteiras e favoritos),
  persistência em `kurio.mockdb.v1` e reset. As senhas usam PBKDF2 via WebCrypto; os hashes da seed são
  pré-calculados para o reset ser síncrono.
- **Handlers REST** de todos os recursos do plano, com a rede simulada aplicada antes de cada um
  (`route()` em `handlers/http.ts`).
- **Servidor de eventos:**
  - clientes por usuário (token da query) e `order.updated` só para o dono;
  - `dropSocket` recusa conexões novas durante a queda;
  - o processamento do pedido (pendente → confirmado/recusado em ~2 s) sobrevive a refresh, via `settleAt` no banco.
- **Cenários:**
  - os 11 do plano, mais o `wallet-rejected` (a recusa de conexão da carteira precisava de um gatilho);
  - escolha por URL, painel ou `__kurio`;
  - sorteio de rede por requisição (seed + método + URL + ocorrência).
- **`window.__kurio`:** `reset`, `setScenario`, `setLatency`, `failNext`, `emitNftUpdate`,
  `emitDuplicates`, `dropSocket`, `expireSession` e `connectedClients`.
- **Painel "Cenários":** botão flutuante; o painel é carregado no clique. Foco vai para o select e Esc
  fecha devolvendo o foco. `?devtools=off` esconde o botão (usar na regressão visual).
- **Cliente Axios:**
  - timeout de 10 s por `AbortController` + `setTimeout`;
  - todo erro vira `ApiError` (`code`, `status`, `fields`, `quote`, `retryAfterMs`, `isTransient`);
  - headers `Authorization` e `X-Cart-Id`, e arrays repetidos na query string;
  - o retry das queries usa `isTransient`.
- **Testes:**
  - `e2e/api-contract.spec.ts`: 21 testes, só no desktop, que validam cada endpoint com os schemas,
    passando pelo service worker;
  - smoke atualizado (9 cards). **E2E: 27 passando, local e contra a URL pública (21 pulados: o contrato não roda no mobile).**

### Decisões e desvios

- Preço do card = preço da edição padrão (a primeira). Filtros e ordenação usam esse preço.
- As edições custam 100% / 60% / 35% / 15% do 1/1 (1/1, 1/10, 1/50, Aberta). A edição aberta tem
  `supply: null` e 999 disponíveis. O limite é de 10 por item.
- ETH na forma canônica na API (`2.5`); a UI formata com `formatEth` (`2.50 ETH`).
- Série (`Kurio Apes`, `Kurio Editions`, `Kurio Relics`) é diferente de coleção (as 9 categorias do filtro).
  "Mais desta coleção" usa a série.
- O pedido exige carteira conectada (`POST /wallet-sessions`). O resultado (recusa) é decidido na criação,
  para a troca de cenário não mudar um pedido em andamento.
- O `order-timeout` atrasa a resposta em 12 s (o cliente desiste em 10 s).
- O `price-change` sobe o preço 1,5 s depois da primeira cotação.
- Endpoint extra `GET /wallet-sessions/current`, para o checkout saber se a carteira está conectada depois de um refresh.
- `failNext` (fora do plano) dá falhas determinísticas para o teste de rollback dos favoritos.
- ESLint: `no-unused-vars` com `ignoreRestSiblings`, e o `react-refresh` ignora `src/mocks/`.

### Pendências

- O app ainda não usa auth, carrinho e o resto: isso vem nas Fases 3 a 6. O `RealtimeBridge` abre o socket
  sem token; na Fase 4 ele passa a reabrir com o token do usuário logado.
- O processador e o sync ainda só atualizam a lista; detalhe e carrinho entram nas Fases 3 e 4.
- Próxima: Fase 3.
