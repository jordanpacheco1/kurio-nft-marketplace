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

**Status:** código pronto e testado localmente; falta o deploy na Vercel (ver Pendências).

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

- [ ] Jordan importar o repositório na Vercel e mandar a URL.
- [ ] Rodar o smoke contra a URL pública (`BASE_URL=... npm run test:e2e`) e conferir refresh em rota interna.
