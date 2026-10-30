# API simulada — contratos REST e eventos

Todos os contratos são schemas Zod em `src/shared/contracts/`, usados pelo app (para validar as respostas),
pelos mocks (para tipar as respostas) e pelo teste `e2e/api-contract.spec.ts` (que valida cada endpoint).
Os handlers ficam em `src/mocks/handlers/`, um arquivo por recurso.

- **Base:** `/api`, caminho relativo. As requisições passam pelo service worker do MSW.
- **Autenticação:** `Authorization: Bearer <token>`. O token vem do login ou do cadastro.
- **Carrinho de visitante:** header `X-Cart-Id` (8 a 64 caracteres `[A-Za-z0-9-]`). O cliente gera um UUID
  e o guarda em `localStorage` (`kurio.cartId`).
- **Valores em ETH:** sempre string decimal (até 18 casas), na forma canônica: `"1.19"`, `"2.5"`, `"0.016"`.
  Os cálculos usam `bigint` em wei (`src/shared/money`). Quantidades são inteiras.
- **Datas:** ISO 8601 com fuso.

## Erros

Envelope único: `{ "error": { "code", "message", "fields"?, "quote"? } }`.

| Status | `code` | Quando |
| --- | --- | --- |
| 422 | `VALIDATION_ERROR` | Corpo ou params inválidos. `fields` traz uma mensagem por campo (`{ "email": "E-mail inválido" }`). |
| 401 | `UNAUTHENTICATED` | Sem token, token desconhecido ou login errado. |
| 401 | `SESSION_EXPIRED` | Token vencido. A sessão é apagada. |
| 403 | `FORBIDDEN` | Pedido de outro usuário, carrinho de usuário acessado sem sessão, carteira recusou a conexão. |
| 404 | `NOT_FOUND` | Recurso inexistente. Carteira de outro usuário também responde 404, para não revelar que existe. |
| 409 | `CONFLICT` | E-mail ou usuário já cadastrado (`fields` aponta o campo), posição de carteira já ocupada. |
| 409 | `OUT_OF_STOCK` | Quantidade acima do estoque da edição. |
| 409 | `QUOTE_STALE` | A cotação não vale mais. `quote` já traz a cotação nova, quando dá para cotar de novo. |
| 409 | `IDEMPOTENCY_CONFLICT` | `Idempotency-Key` reutilizada com outro corpo. |
| 503 | `UNAVAILABLE` | Falha transitória, com `Retry-After: 1`. |

Falha de conexão (cenário `offline`) não tem corpo: o `fetch` rejeita e o Axios vira `NETWORK_ERROR`.
O cliente também gera `TIMEOUT` (10 s sem resposta) e `CANCELED`; ver `src/shared/api/errors.ts`.

## Sessão

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `POST /auth/register` | `{ username, email, password }` | 201 `Session` · 409 `CONFLICT` · 422 |
| `POST /auth/login` | `{ email, password }` | 200 `Session` · 401 `UNAUTHENTICATED` |
| `GET /auth/session` | — | 200 `{ user, expiresAt }` · 401 |
| `POST /auth/logout` | — | 204 (sempre; também encerra a conexão de carteira) |

- `Session = { token, user: { id, username, email, displayName, avatarUrl }, expiresAt }`.
- A sessão dura 2 h (30 s no cenário `session-expired`).
- **Regras:**
  - `username` tem de 3 a 24 caracteres `[a-z0-9_.]`;
  - a senha tem de 8 a 72 caracteres, com pelo menos uma letra e um número;
  - o e-mail é comparado sem diferenciar maiúsculas.
- **Senhas:** o mock guarda só o hash PBKDF2-SHA-256 (100 mil iterações, salt por usuário), nunca o texto.

## NFTs

| Método e rota | Resposta |
| --- | --- |
| `GET /nfts` | `NftList`: `{ items: NftSummary[], page, pageSize, total, totalPages, facets }` |
| `GET /nfts/featured` | `{ highlight: NftSummary & { offerEndsAt } \| null, trending: NftSummary[] }` |
| `GET /nfts/:id` | `NftDetail` · 404 |
| `GET /nfts/:id/related` | `{ items: NftSummary[] }` (mesma série primeiro, até 8) |

**Params de `GET /nfts`** (arrays repetidos: `networks=ethereum&networks=polygon`):

| Param | Valores | Padrão |
| --- | --- | --- |
| `q` | Busca no nome, token, série e coleção (sem acento nem caixa) | — |
| `collections` | `arte-digital`, `fotografia`, `musica`, `arte-3d`, `colecionaveis`, `generativa`, `jogos`, `assinaturas`, `utilidade` | todas |
| `networks` | `ethereum`, `polygon`, `solana` | todas |
| `min`, `max` | ETH, inclusivo, sobre o `priceEth` do card | — |
| `sort` | `recent`, `price-asc`, `price-desc`, `name` | `recent`; na aba `trending`, popularidade |
| `tab` | `all`, `new` (até 10 dias antes do mais recente), `trending` (popularidade ≥ 70) | `all` |
| `page`, `pageSize` | inteiros; `pageSize` até 48 | `1`, `9` |

- **Facetas:**
  - `facets.collections[]` e `facets.networks[]` trazem `{ id, label, count }`;
  - cada faceta conta com os outros filtros aplicados, menos o dela;
  - `facets.price` traz a faixa do catálogo inteiro (`0.02` a `12.3`).
- **Página além da última:** devolve `items: []`, com `totalPages` correto.
- **`NftSummary`:** `{ id, name, tokenId, collection, network, image, priceEth, available, rare, listedAt, version }`.
  - `priceEth` é o preço da edição padrão (a primeira);
  - `available` soma o estoque de todas as edições.
- **`NftDetail`:** o resumo mais `{ description, series, creator, attributes[], rating, gallery[], editions[] }`.
- **`Edition`:** `{ id, label, supply, available, priceEth, version }`.
  - `id` é `e1`, `e10`, `e50` ou `open`;
  - `label` é `1/1`, `1/10`, `1/50` ou `Aberta`;
  - `supply` é `null` na edição aberta.

## Favoritos (autenticado)

| Método e rota | Resposta |
| --- | --- |
| `GET /me/favorites` | `{ items: NftSummary[] }`, do mais recente para o mais antigo |
| `PUT /me/favorites/:nftId` | `{ nftId, favorited: true }` · 404 se o NFT não existe |
| `DELETE /me/favorites/:nftId` | `{ nftId, favorited: false }` (idempotente) |

## Carrinho

Com `Authorization`, é o carrinho do usuário. Sem ele, é o carrinho de visitante do `X-Cart-Id`, criado
na primeira chamada. Um id de carrinho de usuário enviado sem a sessão dá 403.

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `GET /cart` | — | `Cart` |
| `POST /cart/items` | `{ nftId, editionId, quantity }` | 201 (linha nova) ou 200 (soma na linha) · 404 · 409 `OUT_OF_STOCK` · 422 acima de 10 |
| `PATCH /cart/items/:itemId` | `{ quantity }` | `Cart`. Diminuir sempre pode; aumentar valida o estoque |
| `DELETE /cart/items/:itemId` | — | `Cart` (remove o cupom se o carrinho esvaziar) |
| `PUT /cart/coupon` | `{ code }` | `Cart` · 422 com `fields.code` = `Cupom inválido` ou `Este cupom expirou` |
| `DELETE /cart/coupon` | — | `Cart` |
| `POST /cart/merge` | `{ guestCartId }` | `{ cart, adjustments[] }` (autenticado) |

- **`Cart`:** `{ id, items[], coupon, itemCount, subtotalEth, discountEth, estimatedNetworkFeeEth, totalEth }`.
- **`CartItem`:** `{ id: "nftId:editionId", nftId, editionId, name, tokenId, image, editionLabel, quantity, unitPriceEth, lineTotalEth, available, version }`.
  - Preço e estoque são os atuais do catálogo.
  - Se `available < quantity`, a linha precisa de ajuste: a cotação falha com `OUT_OF_STOCK`.
- **Cupons (regra fixa do mock):** `KURIO10` (10%) e `GENESIS5` (5%) são válidos, `EXPIRADO` está
  vencido e qualquer outro código é inválido. O código não diferencia maiúsculas.
- **Merge no login:**
  - soma as quantidades, limitadas ao estoque e a 10 por edição;
  - cada corte aparece em `adjustments: [{ itemId, requested, applied }]`;
  - o cupom do visitante vale se o usuário não tiver um;
  - o carrinho do visitante é apagado.
- **Totais:** `discount = floor(subtotal × % / 100)` em wei e `total = subtotal − discount + taxa`.
  A taxa de rede não tem desconto. O carrinho estima a taxa da Ethereum.

## Cotação e pedidos (autenticado)

| Método e rota | Corpo / headers | Resposta |
| --- | --- | --- |
| `POST /quotes` | `{ network }` | 201 `Quote` · 422 carrinho vazio · 409 `OUT_OF_STOCK` |
| `POST /orders` | `Idempotency-Key` + `{ quoteId, walletId, network, collector }` | 201 `Order` (novo) · 200 (mesma tentativa) · 409 · 422 |
| `GET /orders/:id` | — | `Order` · 403 de outro usuário · 404 |

- **`Quote`:** `{ quoteId, network, lines[], subtotalEth, discountEth, networkFeeEth, totalEth, coupon, expiresAt }`.
  - Cada linha traz a `version` da edição;
  - a cotação vale 5 min;
  - a taxa de rede é de 0.016 ETH (Ethereum), 0.002 (Polygon) ou 0.001 (Solana).
- **`collector`:** `{ displayName, username, profileName, email, ensName, secondaryWallet?, referralCode?, note? }`.
- **Ordem das validações do `POST /orders`:**
  1. **Idempotência:** a mesma chave com o mesmo corpo devolve o pedido já criado (200); com outro
     corpo, dá 409 `IDEMPOTENCY_CONFLICT`. A chave é por usuário.
  2. **Carteira:** precisa ser do usuário e estar conectada (`POST /wallet-sessions`). Senão, 422 com `fields.walletId`.
  3. **Estoque:** linha acima do estoque dá 409 `OUT_OF_STOCK`.
  4. **Cotação atual:** a cotação precisa ser do usuário, estar dentro do prazo e sem uso, ter a mesma rede
     e bater com o carrinho (mesmos itens, quantidades, versões de edição e cupom). Senão, 409
     `QUOTE_STALE` com `error.quote` novo.
- **`Order`:** `{ id, status, version, createdAt, updatedAt, network, itemCount, totalEth, receipt, declineReason }`.
  - `status` começa em `pending` e termina em `confirmed` ou `declined` (~2 s depois). Os dois são terminais.
  - `receipt` só existe com `confirmed`. É o snapshot gravado na confirmação, com hash da transação,
    link de explorador simulado, carteira, linhas e totais. Mudanças posteriores no catálogo não o alteram.
  - Na confirmação, o estoque cai (com `nft.updated`) e o carrinho perde só os itens e as quantidades
    comprados. Se o pedido for recusado, o carrinho fica intacto.
  - Se a aba fechar com o pedido pendente, ele fecha no próximo boot dos mocks ou no próximo `GET /orders/:id`.

## Perfil (autenticado)

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `GET /me/profile` | — | `Profile` |
| `PATCH /me/profile` | parcial de `{ displayName, username, email, ensName, walletNickname }` | `Profile` · 409 `CONFLICT` · 422 |
| `PUT /me/avatar` | `{ dataUrl }` (PNG/JPEG/WebP em base64, até 200 kB; o cliente redimensiona para 256 px) | `Profile` |
| `DELETE /me/avatar` | — | `Profile` |
| `POST /me/password` | `{ currentPassword, newPassword }` | 204 · 422 com `fields.currentPassword` ou `fields.newPassword` |

## Carteiras (autenticado)

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `GET /me/wallets` | — | `{ items: Wallet[] }` (principal primeiro) |
| `POST /me/wallets` | `{ slot, label, address, network, provider }` | 201 `Wallet` · 409 posição ocupada · 422 |
| `PATCH /me/wallets/:id` | parcial, sem `slot` | `Wallet` · 404 |
| `GET /wallet-sessions/current` | — | `{ session: WalletSession \| null }` |
| `POST /wallet-sessions` | `{ walletId, network }` | 201 `WalletSession` · 403 no cenário `wallet-rejected` |
| `DELETE /wallet-sessions/:id` | — | 204 · 404 |

- `Wallet = { id, slot: primary|secondary, label, address, network, provider: metamask|walletconnect|coinbase, updatedAt }`.
- `address` aceita `0x` + 40 hex ou um nome ENS `*.eth`.
- Cada usuário tem uma conexão de carteira por vez.

## Eventos Socket.IO

- **Transporte:**
  - `socket.io-client` 4 com `transports: ['websocket']`, conectando em `VITE_SOCKET_URL`
    (`wss://realtime.kurio.test`);
  - o MSW intercepta o WebSocket (`ws.link`) e o `@mswjs/socket.io-binding@0.2.0` traduz o protocolo;
  - o socket se autentica com `query: { token }`.
- **Limitações do binding:**
  - só o transporte WebSocket (polling não passa pelo MSW);
  - não há acks nem namespaces, e o payload de `auth` não é exposto (por isso o token vai na query);
  - o binding não manda ping do Engine.IO, então o servidor simulado envia um a cada 20 s;
  - cada aba tem o próprio servidor simulado, e eventos não cruzam abas.

**Envelope:** `{ eventId, type, resource: { type, id }, version, occurredAt, userId?, data }`.
`version` é a versão do recurso depois da mudança. O cliente descarta `eventId` repetido e versão menor
ou igual à que já tem.

| Evento | Para quem | `data` |
| --- | --- | --- |
| `nft.updated` | Todos os sockets | `{ priceEth, available, editions: [{ id, priceEth, available, version }] }` (estado completo depois da mudança) |
| `order.updated` | Só os sockets do dono do pedido (pelo token) | `{ status, receipt, declineReason }`, com `userId` obrigatório |

Toda mudança de dados do mock grava no banco e emite o evento: mudar um preço incrementa a `version`
da edição e do NFT, e o `GET /nfts/:id` já devolve o valor novo.

## Cenários e `window.__kurio`

Os cenários são escolhidos por `?scenario=<id>` (com `?seed=<n>` opcional), pelo painel "Cenários" ou
por `window.__kurio.setScenario(id, seed?)`, e ficam guardados no `localStorage`. `?devtools=off`
esconde o botão do painel.

| Cenário | Efeito |
| --- | --- |
| `default` | Latência de 50–150 ms; o pagamento confirma em ~2 s |
| `slow` | Latência de 1,5–3 s |
| `flaky` | 30% das respostas com 503 + `Retry-After` |
| `offline` | Toda requisição falha na conexão |
| `out-of-order` | Em `GET /nfts`, termos de busca mais curtos demoram mais (`q=a` chega depois de `q=ape`) |
| `empty` | Catálogo vazio (`highlight: null`, detalhe 404) |
| `session-expired` | Sessões novas duram 30 s |
| `price-change` | 1,5 s depois da primeira cotação, o preço do primeiro item sobe 15% (com `nft.updated`) |
| `sold-out` | Na primeira tentativa de pedido, a edição do primeiro item esgota (com `nft.updated`) e o pedido dá `OUT_OF_STOCK` |
| `order-timeout` | O primeiro pedido é criado, mas a resposta demora 12 s (o cliente desiste em 10 s). O reenvio com a mesma chave devolve o pedido |
| `payment-declined` | O pagamento é recusado |
| `wallet-rejected` | `POST /wallet-sessions` dá 403 |

- **Determinismo:**
  - os sorteios de rede (latência e 503) são feitos por requisição: a n-ésima chamada a um mesmo método + URL
    tem sempre o mesmo resultado para a mesma seed, não importa o resto do tráfego;
  - os fixtures usam uma seed fixa própria, para a regressão visual ter sempre os mesmos dados;
  - os gatilhos de uma vez só (`price-change`, `sold-out`, `order-timeout`) rearmam a cada `setScenario`.
- **Regras fixas, sem cenário:** conflito de cadastro (cadastre com `colecionador@kurio.test`) e
  cupom inválido ou expirado.

`window.__kurio` existe só com os mocks ligados, e o app nunca o chama:

| Função | O que faz |
| --- | --- |
| `reset(scenario?, seed?)` | Volta o banco à seed, limpa sessões, pedidos pendentes, falhas forçadas e latência fixa; derruba os sockets para reconciliarem |
| `setScenario(id, seed?)` / `getScenario()` / `scenarios()` | Escolhe e consulta o cenário |
| `setLatency(ms \| null)` | Latência fixa para todo o REST (`null` volta à do cenário) |
| `failNext(method, regexDoPath, code?)` | A próxima requisição que casar falha com o código (padrão `UNAVAILABLE`; `'NETWORK'` simula queda) |
| `emitNftUpdate(nftId, { editionId?, priceEth?, available? })` | Grava no banco e emite `nft.updated` |
| `emitDuplicates(nftId, change)` | Aplica a mudança, emite o evento duas vezes e depois uma cópia com a versão anterior |
| `dropSocket(ms = 5000)` | Fecha as conexões e recusa novas por `ms` |
| `expireSession()` | Vence todas as sessões agora |
| `connectedClients()` | Número de sockets conectados |

## Fixtures

- **NFTs:**
  - são 42 (5 páginas de 9): os 9 do Figma, com os preços do layout, e mais 33 gerados com seed fixa;
  - cobrem as 9 coleções e as 3 redes, com preços de 0.02 a 12.3 ETH;
  - as edições combinam 1/1, 1/10, 1/50 e Aberta;
  - a 1/1 do Golden Signal #160 está esgotada, e há um NFT com todas as edições esgotadas.
- **Usuários:** `colecionador@kurio.test` e `curadora@kurio.test`, ambos com a senha `Kurio@2026`.
  - O colecionador tem a carteira principal (`0xA91F…E82C`, Ethereum, MetaMask), a secundária
    (`nova.kurio.eth`, Polygon, Coinbase) e 2 favoritos.
  - A curadora tem 1 favorito e nenhuma carteira.
- **Persistência:** o banco inteiro fica em `localStorage` (`kurio.mockdb.v1`) e sobrevive ao refresh.
  O reset restaura a seed.
