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
- Fase 3 concluída (abaixo).

## Fase 3 — Catálogo e detalhe

**Status:** concluída em 30/10. Screenshots lado a lado com o Figma: `docs/screenshots/fase3-*.png`.

### Feito

- **Layout:**
  - header desktop com busca (abre ao clicar na lupa), badge do carrinho e "Entrar";
  - footer completo do Figma;
  - tab bar mobile (some no detalhe, que tem a barra de compra);
  - link "Pular para o conteúdo";
  - utilitário `page-container`: 1200 px de conteúdo, com respiro abaixo disso.
- **Início:**
  - hero estático, com a imagem pré-carregada no `index.html`;
  - filtros (coleções, faixa de preço com slider duplo + Aplicar, rede), abas, ordenação, paginação e busca
    (debounce de 300 ms), tudo na URL com Zod em `validateSearch` + `stripSearchParams`;
  - skeletons, indicador "Atualizando resultados…" (`keepPreviousData`), estado vazio com "Limpar filtros"
    e erro com "Tentar de novo";
  - "NFT em destaque" vindo de `/nfts/featured`, os 2 cards promocionais (levam a filtros reais) e o
    "Diário da Cunhagem" estático;
  - no mobile: busca + sheet de filtros (com a ordenação) e grid de 2 colunas desencontrado.
- **Card:** o link do nome cobre o card. No desktop as ações (carrinho, favoritar e zoom num dialog) aparecem
  no hover ou com o foco; no mobile, só o coração. Mostra os chips RARO e Esgotado.
- **Detalhe:**
  - galeria com miniaturas e zoom;
  - edições como rádios, com `?edition=` na URL;
  - quantidade limitada ao estoque e a 10;
  - Comprar (adiciona e vai para `/carrinho`), adicionar ao carrinho e favoritar;
  - abas Detalhes / Avaliações e "Mais desta coleção" (linha estática, `/nfts/:id/related`);
  - telas de NFT inexistente, erro e skeleton;
  - avisos de edição esgotada, inexistente e de tudo esgotado.
  - No mobile: imagem com voltar e favoritar, sheet de informações e barra fixa de compra.
- **Favoritos:** atualização otimista (`onMutate`, rollback no `onError` e `invalidateQueries` no `onSettled`),
  com anúncio no `aria-live`. O visitante vai para `/login?redirect=…`.
- **Carrinho:** `useCart` (do usuário ou de visitante), `useAddToCart` e o badge.
- **Sessão mínima** (`features/auth/queries.ts`): `GET /auth/session` com o token salvo, só para ter o
  `userId` das keys privadas. O login de verdade entra na Fase 4.
- **Tempo real:** `nft.updated` agora atualiza lista, destaque, relacionados, favoritos e detalhe
  (edições com versão própria). Anuncia mudança de preço, de estoque ou "esgotou".
- **shadcn:** dialog, sheet, slider (com `thumbLabels` para o nome acessível de cada alça) e tabs. "Close" foi
  traduzido para "Fechar".
- **E2E (`catalog.spec.ts` e `nft-detail.spec.ts`, desktop e mobile):**
  - cenário 1: filtro + ordenação, paginação, busca combinada, voltar duas vezes no histórico e reload,
    comparando os cards com a resposta da API;
  - estado vazio;
  - cenário 12: skeletons no `slow`, e no `offline` o erro aparece e "Tentar de novo" recupera;
  - cenário 2: acesso direto, NFT inexistente e navegação a partir do card;
  - edição esgotada, limite de quantidade, compra levando ao carrinho com o badge, favoritar sem login,
    favoritar otimista com rollback (`failNext`) e `nft.updated` no detalhe.
  - **Resultado: 51 passando, 21 pulados (o contrato não roda no mobile).** Sem overflow horizontal em
    390, 768 e 1024 px.

### Decisões e desvios do Figma

- **Mercado** leva para o catálogo da home (`/#catalogo`) e fica ativo no detalhe, como no frame.
- **A busca** cria uma entrada no histórico no primeiro termo; refinar o termo só substitui a entrada.
- **Faixa de preço:** `min`/`max` ficam como número na URL; a API recebe string decimal.
- **Edição inicial:** a primeira com estoque. Se ela esgotar em tempo real, continua selecionada e aparece
  o aviso, em vez de trocar sozinha.
- **Ações do card:** o botão de carrinho adiciona 1 unidade da primeira edição com estoque.
- **Acréscimos ao Figma:** no detalhe desktop há um botão "Adicionar ao carrinho" ao lado de COMPRAR, e a
  trilha mostra o nome do NFT.
- **Compartilhar** virou "Copiar link" + "E-mail" (`mailto:`), que funcionam de verdade. As redes sociais
  ficam como "Em breve" no footer.
- **A aba Avaliações** mostra só a nota e o total: a API não tem comentários.
- **Itens "Em breve" (desabilitados):** Criadores, Aprenda, newsletter, redes sociais, colunas "Meu perfil"
  e "Central de ajuda" do footer, "Ler mais" do blog e botão central da tab bar. As colunas de coleções do
  footer filtram de verdade.
- **Ícones:** −/+ do lucide (o Iconly não tem "Minus"); o resto é Iconly curved.
- **Checkboxes:** os filtros usam checkbox nativo com `accent-color` cobre (o Figma mostra só o texto),
  para ficar claro o que está marcado sem depender só de cor.
- **Mobile:** as abas usam 15 px para caber em 390 px.
- **Nota do Emerald Ape:** a seed diz 4,5 e o Figma mostra 4.8. A tela segue a API.

### Pendências

- `/login` e `/carrinho` são telas provisórias (`ComingSoon`); a Fase 4 as substitui. Os ícones de
  Favoritos e Perfil da tab bar vão para `/login?redirect=…` até existirem as telas (Fases 4 e 6).
- O header ainda não tem o estado logado (avatar + menu): Fase 4.
- O `RealtimeBridge` continua sem token (Fase 4). Carrinho no tempo real (aviso de preço): Fase 4.
- Fase 7: regressão visual.
- Fase 8: Lighthouse. O preload do hero vale para todas as rotas; ver se pesa no detalhe.
- Fase 4 concluída (abaixo).

## Fase 4 — Conta e carrinho

**Status:** concluída em 30/10. Screenshots lado a lado com o Figma: `docs/screenshots/fase4-*.png`.

### Feito

- **Sessão** (`features/auth/`):
  - token reativo (`useToken` com `useSyncExternalStore`, inclusive entre abas);
  - login e cadastro: validação com Zod no cliente, erros da API por campo (`aria-describedby`), foco no
    primeiro campo inválido e retorno ao `redirect` (só caminhos internos);
  - o conflito de cadastro (regra fixa do mock) aponta e-mail e usuário;
  - a sessão volta depois do refresh (`GET /auth/session`);
  - **expiração:** qualquer 401 `SESSION_EXPIRED` (ou `UNAUTHENTICATED` com token salvo) em query ou
    mutation passa pelo `QueryCache`/`MutationCache`. O `SessionWatcher` limpa a sessão e leva a
    `/login?redirect=<tela atual>&reason=expired`, que mostra o aviso e volta para a mesma tela depois;
  - **login/troca de usuário:** cancela e remove `['me']`, faz o merge do carrinho de visitante (com o token
    explícito, antes de publicá-lo, para nenhuma query buscar o carrinho antes do merge), gira o `X-Cart-Id`
    e avisa se alguma quantidade foi ajustada ao estoque;
  - **logout:** `POST /auth/logout`, remove `['me']` e `['session']`, cancela as requisições privadas e limpa
    os avisos do carrinho;
  - **socket:** o `RealtimeBridge` depende do token. A cada login, logout ou troca, fecha o socket anterior
    (e os listeners) e abre outro com o token novo.
- **Rotas:** `/login` e `/cadastro` (dialog a partir de 1024 px sobre o hero da home; página abaixo disso,
  sem tab bar nem footer); `requireAuth` no `beforeLoad` de `/perfil/*` e `/checkout`; quem já está logado
  e abre `/login` segue direto para o destino.
- **Header logado:** avatar (inicial ou foto) + menu Perfil, Carteiras e Sair (dropdown do shadcn). Na tab
  bar, Favoritos e Perfil apontam para as rotas protegidas (o guard faz o resto).
- **Carrinho** (`/carrinho`, público):
  - desktop: tabela com colunas fixas, lixeira, −/+ e "Colecionadores também viram"; mobile: cards e sheet de
    resumo fixo no rodapé (sticky), com cupom em pílula e CTA em gradiente;
  - quantidade até o estoque e o limite de 10. Se o estoque caiu abaixo da quantidade, a linha avisa,
    só deixa diminuir e o "Conectar e finalizar" fica bloqueado até ajustar;
  - cupom com erro no próprio campo (inválido e expirado), cupom aplicado com "Remover cupom";
  - **o resumo usa os valores que a API calcula no carrinho** (subtotal, desconto, taxa estimada e total);
    o cliente não soma nada. Toda mutation devolve o carrinho inteiro e substitui o cache;
  - estados de carregamento, vazio, erro com "Tentar de novo" e linha ocupada (`aria-busy`);
  - "Conectar e finalizar" vai para `/checkout` (o guard pede login e o merge preserva os itens).
- **Tempo real no carrinho:** `nft.updated` com uma edição que está em algum carrinho do cache gera os avisos
  "O preço de X mudou de A para B" e "Só restam N unidades…/esgotou", anunciados no `aria-live` e mostrados
  na tela até serem dispensados. Depois invalida o carrinho e a cotação (`['me', id, 'quote']`, Fase 5).
  Na reconexão do socket, carrinho e cotação também são invalidados.
- **E2E** (desktop e mobile):
  - `auth.spec.ts` (cenário 3 e parte do 4): cadastro com validação, conflito e sucesso + refresh; senha
    errada e retorno ao NFT, com favorito salvo depois do refresh; rota protegida; sessão expirada no
    carrinho voltando para `/carrinho`; logout e troca de usuário sem vazar favoritos, carrinho nem socket;
  - `cart.spec.ts` (cenário 5): quantidades até o limite, remoção, cupom inválido/expirado/válido, resumo
    igual ao da API, persistência no refresh, merge do visitante no login via `/checkout` e preço/estoque
    em tempo real bloqueando e liberando a finalização.
  - **Resultado: 67 passando, 21 pulados (contrato só no desktop).** Sem overflow em 390, 768 e 1024 px nas
    três telas novas.

### Decisões e desvios do Figma

- **Resumo do carrinho:** vem do carrinho calculado pela API (mesma regra da cotação). A cotação de verdade,
  com a rede escolhida, fica no checkout (Fase 5), porque `POST /quotes` exige login e o visitante também
  tem carrinho. A taxa aparece como "Taxa estimada (Ethereum)".
- **Labels:** o Figma só tem placeholder; os campos têm `<label>` só para leitor de tela (exceto o cupom
  no desktop, que tem o rótulo visível do frame).
- **Login desktop:** o fundo é o hero da home (inerte), não a home inteira, porque a home depende dos
  search params de `/`. Fechar o dialog volta para o `redirect`, ou para `/` se o destino for protegido.
- **Mercado** fica ativo no header também no carrinho, como no frame.
- **Desconto:** `(-) 0.00 ETH` em vez do `(-) 00.00` do Figma (defeito listado).
- **Carrinho desktop:** a linha mostra "ID do token: #0042 · 1/50" (o Figma não mostra a edição no
  desktop; sem ela, duas edições do mesmo NFT ficariam iguais). Remover tem nome acessível com a edição.
- **Mobile:** sem tab bar no carrinho (o sheet de resumo ocupa o rodapé, como no frame), sem footer no
  carrinho e no login/cadastro.
- "Esqueceu a senha?", Google e Facebook ficam desabilitados com "Em breve".
- `/perfil`, `/perfil/carteiras`, `/perfil/favoritos` e `/checkout` são telas provisórias já protegidas.
  O `/perfil` provisório tem "Sair da conta" (no mobile não há outro lugar para sair).
- Testes: o `catalog.spec` esperava o MSW depois do reload antes de chamar a API direto (corrida do teste).

### Pendências

- Fase 5: checkout usa `requireAuth`, a key `['me', userId, 'quote']` (já invalidada pelos eventos) e o
  rascunho no `sessionStorage` quando a sessão expira (o `SessionWatcher` já manda para o login com
  `redirect=/checkout&reason=expired`; falta salvar e restaurar o rascunho).
- Fase 6: substituir os placeholders de `/perfil/*`; a foto do avatar no header já usa `user.avatarUrl`.
- Fase 5 concluída (abaixo).

## Fase 5 — Checkout, pedido e confirmação

**Status:** concluída em 30/10. Screenshots lado a lado com o Figma: `docs/screenshots/fase5-*.png`.

### Feito

- **Pagamento** (`/checkout`, `features/checkout/`):
  - desktop: formulário "Perfil do colecionador" do Figma, pré-preenchido com o perfil (`GET /me/profile`),
    validado com o `collectorSchema` da API (erros por campo, foco no primeiro inválido); coluna "Seus NFTs"
    com as linhas e totais da **cotação** (`POST /quotes`, key `['me', userId, 'quote', network]`);
  - mobile: só a escolha de carteira e rede + total. Os dados do colecionador vêm do perfil; se faltar algo
    (ex.: sem ENS), um sheet pede **só os campos que faltam**;
  - **etapa de revisão** nos dois layouts: "Confirmar compra" valida, exige carteira conectada, refaz a
    cotação e mostra "Revise sua compra" com o botão "Pagar X ETH";
  - **cotação mudou** (`nft.updated` invalida a cotação que tem o NFT, revalidação ou `QUOTE_STALE`, que já
    traz a cotação nova): lista o que mudou (preço, quantidade, itens, cupom, taxa, total), anuncia no
    `aria-live` e trava a compra até "Aceitar novos valores". Item sem estoque: a cotação falha com
    `OUT_OF_STOCK`, a compra trava e aparece "Ajustar o carrinho";
  - **rascunho** (dados, carteira e rede) no `sessionStorage` por usuário (`kurio.checkoutDraft.<id>`),
    salvo a cada mudança: volta depois do login quando a sessão expira no meio.
- **Carteiras** (`features/wallets/`): as cadastradas como rádios (provider, endereço, rede, "Conectada");
  escolher uma ajusta a rede. Conexão simulada: conectar, recusada (`wallet-rejected`) e desconectar.
  Sem carteira: link para `/perfil/carteiras` (tela da Fase 6).
- **Pedido** (`features/orders/`):
  - `Idempotency-Key` por tentativa no `sessionStorage` (`kurio.checkoutAttempt.<id>`): mesmo corpo → mesma
    chave (duplo clique, timeout, "Tentar de novo"); cotação nova reconfirmada → corpo novo → chave nova;
  - o `POST /orders` tenta de novo **uma vez** em falha transitória (timeout de 10 s), com a mesma chave;
  - botão travado enquanto a mutation está pendente;
  - `/pedidos/$orderId` (protegida) num dialog: processando, recusado (com o motivo, "Tentar de novo" e
    "Ir para o carrinho") ou o **recibo** do Figma (snapshot da API; "Ver no Etherscan/Polygonscan/Solscan"
    é link simulado);
  - **`order.updated`** no `sync.ts`: descarta evento de outro usuário (`userId` ≠ sessão atual), dedupe e
    versão pelo processador, pedido terminal nunca muda. Anuncia confirmação/recusa;
  - **retomada:** `kurio.pendingOrder` no `localStorage`; o `PendingOrderWatcher` (no layout raiz) busca o
    pedido no boot/refresh, a reconexão do socket invalida pedidos pendentes, e ao terminar ele limpa o
    registro, invalida carrinho e cotação e mostra um toast ("Ver recibo") se o usuário estiver em outra
    tela. Com pedido pendente, o checkout mostra o aviso e não deixa comprar de novo.
- **Mock:** o `dropSocket` fechava as conexões recusadas antes do handshake do Engine.IO; o cliente nunca
  recebia o `close` e a tentativa ficava pendurada até o timeout de 20 s do Manager. Agora o binding abre
  a conexão e ela é fechada no tick seguinte (o cliente vê `connect` + `transport close` até a queda acabar).
- **E2E** (`checkout.spec.ts`, desktop e mobile):
  - cenário 6: do card do catálogo ao recibo (login no meio), estoque baixando uma vez, recibo imutável
    depois de mudar o preço, carrinho vazio depois;
  - cenário 7: recusa mantendo o carrinho + nova tentativa confirmada; duplo clique + `order-timeout` com
    `page.clock` (`fastForward`), conferindo que todos os `POST /orders` usaram a mesma chave e que houve
    uma compra só;
  - cenário 9: preço mudando no formulário e na revisão (aviso, trava, aceitar e pagar com o preço novo),
    estoque abaixo da quantidade e `sold-out` na hora de pagar;
  - cenário 10: `emitDuplicates` sem regredir o preço, queda do socket com pedido pendente (o
    `order.updated` se perde e o REST reconcilia na reconexão) e saída da tela no meio do processamento;
  - validação do formulário + rascunho restaurado após sessão expirada (desktop) e sheet de dados
    faltantes (mobile); carteira recusada/aprovada/desconectada.
  - **Resultado: 89 passando, 23 pulados (contrato só no desktop + 2 testes específicos de um layout).**

### Decisões e desvios do Figma

- **Carteira e rede:** o Figma lista provedores (MetaMask, Coinbase, WalletConnect). Como a API conecta as
  carteiras **cadastradas** (`POST /wallet-sessions { walletId }`), a lista mostra as carteiras do usuário
  com o provedor como etiqueta, e o botão "Conectar <provedor>". No desktop, "Endereço da carteira" e "Tipo
  de carteira" ficam só leitura (vêm da carteira escolhida) e "Usar outra carteira?" troca para a outra.
- **Rede:** select no formulário desktop (como no Figma); rádios no mobile. Escolher a carteira ajusta a rede.
- **Código de indicação** é opcional (defeito do Figma). "Nome ENS" tem o sufixo `.eth` fixo.
- **Desconto** aparece na cotação e no recibo só quando existe; código promocional é aplicado no carrinho
  (o checkout tem o link "Aplique no carrinho").
- **Revisão:** etapa extra (não está no Figma), exigida pelo plano para a revalidação antes de confirmar.
- **Recibo:** data no formato curto do Figma (`30 out, 2026`); ID da transação abreviado com o hash completo
  no `title`; o texto final cita a carteira usada.
- **Mobile:** sem tab bar e sem footer no pagamento (CTA fixo no rodapé, como no frame); "Trocar carteira"
  virou "Gerenciar carteiras" (leva a `/perfil/carteiras`).

### Pendências

- Fase 6: `/perfil`, `/perfil/carteiras` e `/perfil/favoritos` (os links "Gerenciar carteiras" e
  "Cadastrar carteira" do checkout já apontam para lá).
- Fase 7: regressão visual do pagamento (usar o mesmo carrinho dos screenshots: Emerald ×2, Violet ×6,
  Ivory ×9 na edição Aberta).
- `cn` (pacote `cn`) junta `text-caption` com cores `text-*` e remove o tamanho: concatenar a classe
  quando misturar tamanho e cor customizados.
- Fase 6 concluída (abaixo).

## Fase 6 — Perfil e carteiras

**Status:** concluída em 30/10. Screenshots lado a lado com o Figma: `docs/screenshots/fase6-*.png`.

### Feito

- **Layout `/perfil/*`** (`features/profile/components/profile-layout.tsx`): menu lateral "Meu perfil" do Figma
  (Dados do perfil, Carteiras, Lista de interesse e Sair funcionam; Atividade, Ofertas, Arquivos baixados e
  Suporte ficam desabilitados com "Em breve"). No mobile o menu vira pílulas roláveis com Sair.
- **Perfil** (`/perfil`):
  - nome de exibição, usuário, e-mail, ENS (sufixo `.eth` fixo) e apelido da carteira; o `PATCH` leva **só o
    que mudou**; validação com o `profileUpdateSchema` e erros da API por campo (ex.: usuário/e-mail de outra
    conta), foco no primeiro inválido;
  - o perfil salvo atualiza o cache do perfil e o usuário da sessão (`setQueriesData(['session'])`), então
    nome e avatar do header mudam na hora;
  - **avatar:** "Alterar" abre o seletor, corta o centro e redimensiona para 256 px num canvas (WebP, ou JPEG
    como fallback) e envia na hora (`PUT /me/avatar`); "Remover" (`DELETE /me/avatar`). Arquivo que não é
    imagem e erro da API aparecem no grupo do avatar (`aria-describedby`);
  - **senha:** atual, nova e confirmar, com mostrar/ocultar. Preencher um campo exige os outros; "Senha atual
    incorreta" vem da API. Um único "Salvar" (como no Figma) salva os dados e depois a senha; se a senha falhar,
    a mensagem diz que o perfil já foi salvo.
- **Carteiras** (`/perfil/carteiras`): principal e secundária, cada uma com o próprio formulário (apelido, rede,
  endereço `0x…`/`.eth` e tipo). Sem carteira: "Adicionar carteira" (`POST`); com carteira: "Salvar carteira"
  (`PATCH`). Secundária: "Adicionar" abre o formulário e **"Igual à carteira principal"** o preenche com rede,
  endereço e tipo da principal (só falta o apelido). A resposta substitui o item no cache `['me', id, 'wallets']`,
  que o checkout usa.
- **Mock:** regra fixa nova — endereço já ligado a **outra conta** dá 409 `CONFLICT` com `fields.address`
  (dá para repetir o endereço entre as suas carteiras). Documentado em `docs/API.md`.
- **Lista de interesse** (`/perfil/favoritos`): grid com os favoritos (o coração desfavorita de forma otimista e o
  card sai da lista), estados de carregamento, vazio ("Explorar o mercado") e erro.
- `FormField` (label com asterisco, dica e erro) saiu do formulário do checkout para `shared/ui/form-field.tsx`.
  `TextField` ganhou `labelClassName`. A tela provisória `ComingSoon` foi removida (não há mais placeholders).
- **E2E** (`profile.spec.ts`, cenário 8, desktop e mobile): perfil (validação, conflito da API, PATCH só com o que
  mudou, header atualizado, refresh), avatar (arquivo inválido, 256 px, refresh, remover), senha (campos
  obrigatórios, confirmação, senha atual errada, troca valendo no login), carteiras (curadora sem carteiras:
  validação, endereço de outra conta, cadastro, "Igual à principal", edição e refresh) e lista de interesse.
  `auth.spec.ts` ajustado à tela nova. **Resultado: 99 passando, 23 pulados (os mesmos da Fase 5).**
  Sem overflow em 390, 768 e 1024 px nas três telas.

### Decisões e desvios do Figma

- **Carteiras:** o formulário do Figma repete campos do pagamento (nome de exibição, nome do perfil, e-mail,
  ENS, código de indicação, ENS/secundária) — defeito listado. Ficaram só os campos da carteira: apelido, rede,
  endereço e tipo. O "Adicionar" do topo da principal não aparece: a principal sempre mostra o formulário.
- **Perfil:** ENS e apelido da carteira são opcionais (o Figma marca obrigatórios, mas conta nova não tem ENS e
  o contrato aceita `null`). O `.eth` fica como sufixo fixo à direita (mesmo padrão do checkout), não como select.
- **Avatar** salva na hora, sem depender do "Salvar"; o texto de ajuda da senha foi acrescentado.
- **Header:** mostra o avatar logado (o Figma mostra "Entrar" — defeito listado). Atividade e afins: "Em breve".
- Selects nativos, como no checkout.

### Pendências

- Fase 7: cenário 11 (teclado, foco em dialogs e validação de formulários) e regressão visual.
- Fase 8: Lighthouse, README/ARCHITECTURE (registrar os desvios das Fases 3–6) e entrega.
- Próxima: Fase 7.
