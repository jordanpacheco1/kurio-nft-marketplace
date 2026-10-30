# Plano de execução — Kurio

> **Para o Claude Code.** O Jordan quer pensar o mínimo possível, então as decisões abaixo já estão tomadas.
> Siga o plano sem pedir confirmação. Só pergunte se algo bloquear ou se for preciso desviar do plano.
> O enunciado completo está em `docs/CHALLENGE.md` e é a fonte da verdade.

## Como trabalhar

- **Uma fase por sessão.** Ao terminar cada fase:
  - rode `npm run typecheck`, `npm run lint` e os testes da fase, e só siga com tudo passando;
  - faça commit e push (a Vercel publica sozinha a cada push);
  - atualize `docs/PROGRESSO.md` com o que foi feito, as decisões, os desvios do Figma e as pendências;
  - mande ao Jordan um resumo de até 5 linhas dizendo o que ele deve abrir e conferir.
- **Commits pequenos**, no padrão Conventional Commits. Nunca use `--force` nem `--legacy-peer-deps`.
- **O Jordan usa Windows.** Os scripts do `package.json` precisam funcionar em qualquer sistema: nada de
  `rm -rf` nem `VAR=x comando`. Use `cross-env`, `rimraf` ou scripts Node.
- **Idioma:** a interface em pt-BR; código e identificadores em inglês.
- **Regra do enunciado:** componentes, hooks e o cliente Axios nunca contêm respostas fictícias nem caminhos
  alternativos de negócio. Todo dado simulado nasce em `src/mocks/`.
- **Fases de UI:** antes de chamar o Jordan, tire screenshots com o Playwright em 1440 e 414 px. Salve cada
  um lado a lado com o frame correspondente em `docs/screenshots/` e corrija as diferenças grandes.
  Confira também que não há overflow em 390 e 768 px.

## Armadilhas já verificadas

Testadas num spike em 29/10, rodando no Chromium em `vite dev` e em `vite build` + `vite preview`.

1. **Use `msw@^2.15` (linha 2.x), não o 3.x.** O `@mswjs/socket.io-binding@0.2.0`, última versão no npm
   (jun/2025), declara peer `msw@^2.10.2`. Com o msw 3 o npm falha com ERESOLVE.
2. **A API publicada do binding é `toSocketIo(connection)`.** O README do GitHub descreve uma API nova
   (`new SocketIo()` + `ws.link(url, { protocol })`) que ainda não foi publicada no npm. Ignore esse README.
3. **`ws.link` recebe só a origem** (`wss://realtime.kurio.test`). O MSW remove `/socket.io/` do path
   antes de comparar a URL. Se o link incluir `/socket.io/`, a conexão escapa do mock.
4. **Conecte o cliente com `transports: ['websocket']`.** No padrão, que começa por polling, dá `xhr poll error`.
5. **Importe o `socket.io-client` dinamicamente, depois do `worker.start()`.** O `engine.io-client` guarda
   `globalThis.WebSocket` no momento em que o módulo é avaliado. Com import estático ele fica com o
   WebSocket original e o socket escapa do mock (`websocket error`).
6. **Mande o ping do Engine.IO.** O binding anuncia `pingInterval 25000 / pingTimeout 5000` e nunca envia
   ping, então o cliente cai a cada ~30 s com `ping timeout` e reconecta. A solução é mandar o pacote de
   ping (`connection.client.send('2')`) a cada 20 s e limpar o intervalo no `close`. Com isso o socket
   ficou 66 s conectado sem queda.
7. **Autentique o socket pela `query`.** O cliente usa `io(url, { query: { token } })` e o mock lê
   `connection.client.url.searchParams`. O binding aprova o CONNECT sozinho e não expõe o payload de
   `auth`. Não há acks nem namespaces. Para recusar ou derrubar uma conexão, use
   `connection.client.close()`: o cliente recebe `transport close` e reconecta sozinho.
8. O REST pelo service worker funcionou em dev e no build de produção.
9. **Não bloqueie o primeiro render esperando os mocks.** MSW + interceptors pesam bastante (no spike,
   ~100 kB gzip somando o socket.io-client). Renderize o shell e os skeletons na hora; o interceptor do
   Axios e o gerenciador do socket aguardam uma promise `mocksReady`.
10. **Ícones:** o `react-iconly@2.2.10` funciona no React 19 (testado). Use `set="curved"`, como no Figma.
    Equivalências: "Arrow - Down 2" do Iconly = `ChevronDown`; "Arrow - Left/Right 2" = `ChevronLeft`/`ChevronRight`;
    carrinho = `Buy`. Ícones de marca (Google, Facebook, redes sociais) ficam como SVG inline.

Código de referência, testado no spike:

```ts
// src/mocks/realtime/server.ts
import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'

export const realtime = ws.link(import.meta.env.VITE_SOCKET_URL) // só a origem

export const realtimeHandler = realtime.addEventListener('connection', (connection) => {
  const token = connection.client.url.searchParams.get('token')
  const io = toSocketIo(connection)
  const keepAlive = setInterval(() => connection.client.send('2'), 20_000) // ping do Engine.IO
  connection.client.addEventListener('close', () => clearInterval(keepAlive))
  io.client.on('subscribe', (_event, payload) => { /* registrar interesse */ })
  // para enviar um evento: io.client.emit('nft.updated', evento)
})
```

```ts
// src/shared/realtime/socket.ts
import { mocksReady } from '@/app/boot' // resolve após worker.start(), ou na hora se os mocks estiverem desligados

export async function openSocket(token: string | null) {
  await mocksReady
  const { io } = await import('socket.io-client') // import dinâmico: obrigatório com MSW
  return io(import.meta.env.VITE_SOCKET_URL, {
    transports: ['websocket'],
    query: token ? { token } : {},
  })
}
```

## Decisões de arquitetura

### Ferramentas

- Vite + React 19 + TypeScript strict, com npm. Commite o `package-lock.json`.
- TanStack Router com rotas em arquivo (`@tanstack/router-plugin` com `autoCodeSplitting`), TanStack Query v5,
  Axios, socket.io-client 4, Tailwind v4 (`@tailwindcss/vite`), shadcn/ui, Zod, MSW 2 +
  `@mswjs/socket.io-binding`, Playwright, `@lhci/cli` e ESLint. Vitest é opcional, só para `money` e
  para as regras do mock.
- Pacotes de apoio:
  - `tw-animate-css`, que o `theme.css` importa;
  - `@fontsource-variable/roboto-mono` e `@fontsource/inter`, só no peso 600;
  - `react-iconly`;
  - `sonner` para os toasts, instalado via shadcn.
- **shadcn:** rode `npx shadcn@latest init` apontando o CSS para `src/styles/theme.css`. Se o init
  sobrescrever os tokens, restaure com `git checkout -- src/styles/theme.css`.

### Pastas

```
src/
  app/          boot (mocksReady), providers, queryClient, router
  routes/       rotas do TanStack Router (uma por arquivo)
  features/     catalog, nft, cart, checkout, orders, auth, profile, wallets, favorites
                cada uma com api.ts (Axios), queries.ts (queryOptions e mutations) e components/
  shared/
    contracts/  schemas Zod e tipos, usados pelo app e pelos mocks
    api/        instância do Axios, envelope de erro, interceptors
    realtime/   socket, processador de eventos, reconciliação com o cache
    money/      ETH em string decimal <-> bigint (wei)
    ui/         componentes de layout próprios (os do shadcn ficam em components/ui)
  mocks/
    db/         store tipado, seed determinística, persistência em localStorage, reset
    handlers/   REST, um arquivo por recurso
    realtime/   ws.link e emissores de eventos
    scenarios/  registro de cenários, condições de rede, PRNG com seed
    devtools/   painel "Cenários" e window.__kurio (só com os mocks ligados)
    browser.ts  setupWorker
```

### Configuração

- Em `.env`, commitado (não tem segredos): `VITE_ENABLE_MOCKS=true` e `VITE_SOCKET_URL=wss://realtime.kurio.test`.
  Assim a Vercel não precisa de nenhuma configuração. O REST usa caminho relativo: `/api`.
- `vercel.json`: rewrite de SPA para `index.html`, exceto `/api/*`, que deve dar 404 se escapar do mock.

### Rotas

| Rota | Tela | Observação |
| --- | --- | --- |
| `/` | Início | Search params `q, collections[], networks[], min, max, sort, tab, page`, validados com Zod em `validateSearch`. Os valores padrão saem da URL com `stripSearchParams` |
| `/nft/$nftId` | Detalhe | `?edition=` opcional; tela própria para NFT inexistente |
| `/carrinho` | Carrinho | Pública, por causa do carrinho de visitante |
| `/checkout` | Pagamento | Protegida |
| `/pedidos/$orderId` | Pedido pendente, confirmado ou recusado | Protegida; o recibo só aparece com o status `confirmed` |
| `/login`, `/cadastro` | Autenticação | Aceitam `?redirect=`. No desktop abrem como dialog sobre a home; no mobile, como página |
| `/perfil` | Perfil | Protegida |
| `/perfil/carteiras` | Carteiras | Protegida |
| `/perfil/favoritos` | Lista de interesse | Protegida; é o destino do coração da tab bar mobile |
| `*` | 404 | Via `notFoundComponent` |

- Nas rotas protegidas, o `beforeLoad` faz `redirect({ to: '/login', search: { redirect: location.href } })`.
- Os loaders só fazem prefetch, sem `await`. As telas usam `useQuery` com skeletons do mesmo tamanho do conteúdo.

### Contratos REST (base `/api`)

- **Envelope de erro:** `{ error: { code, message, fields? } }`. Status e códigos:

  | Status | Códigos |
  | --- | --- |
  | 400/422 | `VALIDATION_ERROR` |
  | 401 | `UNAUTHENTICATED`, `SESSION_EXPIRED` |
  | 403 | `FORBIDDEN` |
  | 404 | `NOT_FOUND` |
  | 409 | `CONFLICT`, `OUT_OF_STOCK`, `QUOTE_STALE`, `IDEMPOTENCY_CONFLICT` |
  | 503 | `UNAVAILABLE`, com header `Retry-After` |

- **Sessão:** `POST /auth/register`, `POST /auth/login`, `GET /auth/session` e `POST /auth/logout`.
  O token Bearer fica no `localStorage` (em produção seria um cookie httpOnly; documentar). O mock
  guarda as senhas com hash PBKDF2, via WebCrypto.
- **NFTs:**
  - `GET /nfts`, com os params da home + `pageSize=9`, devolve `{ items, page, pageSize, total, totalPages, facets }`;
  - `GET /nfts/featured`;
  - `GET /nfts/:id`, com as edições (`id, label, supply, available, priceEth, version`);
  - `GET /nfts/:id/related`.
- **Favoritos:** `GET /me/favorites`, `PUT /me/favorites/:nftId` e `DELETE /me/favorites/:nftId`.
- **Carrinho:**
  - rotas: `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:itemId`, `DELETE /cart/items/:itemId`,
    `PUT /cart/coupon`, `DELETE /cart/coupon` e `POST /cart/merge`;
  - o visitante é identificado pelo header `X-Cart-Id`, com o id guardado no `localStorage`;
  - no login, o `merge` junta o carrinho do visitante ao do usuário, respeitando a disponibilidade.
- **Cotação:** `POST /quotes { network }` devolve
  `{ quoteId, lines[], subtotalEth, discountEth, networkFeeEth, totalEth, coupon, expiresAt }`.
  Cada linha traz a `version` da edição.
- **Pedidos:**
  - `POST /orders` recebe o header `Idempotency-Key` e o body `{ quoteId, walletId, network, collector }`;
  - mesma chave com o mesmo body devolve o mesmo pedido;
  - mesma chave com body diferente dá 409 `IDEMPOTENCY_CONFLICT`;
  - cotação desatualizada dá 409 `QUOTE_STALE`, já com a cotação nova;
  - `GET /orders/:id` devolve o status (`pending`, `confirmed` ou `declined`) e, se confirmado, o recibo (snapshot);
  - pedido de outro usuário dá 403.
- **Carteiras:**
  - cadastro: `GET /me/wallets`, `POST /me/wallets` e `PATCH /me/wallets/:id`, para a principal e a secundária;
  - validação: endereço `0x` + 40 caracteres hexadecimais; ENS no formato `*.eth`;
  - conexão simulada: `POST /wallet-sessions { walletId, network }`, aprovada ou recusada conforme o
    cenário, e `DELETE /wallet-sessions/:id` para desconectar.
- **Perfil:**
  - `GET /me/profile` e `PATCH /me/profile`;
  - `PUT /me/avatar` (imagem redimensionada no cliente para 256 px e guardada como data URL) e `DELETE /me/avatar`;
  - `POST /me/password`.

### Eventos Socket.IO

- **Envelope:** `{ eventId, type, resource: { type, id }, version, occurredAt, userId?, data }`.
- **`nft.updated`:** traz `data.editions[{ id, priceEth, available }]`.
  - Aplica-se no catálogo (com `setQueriesData` em todas as listas), no detalhe e no carrinho.
  - O carrinho mostra o aviso "O preço de X mudou de A para B" e a cotação é invalidada.
- **`order.updated`:** traz `data.status` e, quando confirmado, o recibo.
  - Só vai para os sockets do dono do pedido, identificado pelo token da query.
  - O cliente também descarta o evento se o `userId` não for o do usuário atual.
  - `confirmed` e `declined` são terminais: nenhum evento posterior muda o pedido.
- **Processador no cliente:**
  - guarda um `Set` com os `eventId` já vistos (LRU de ~500) e um `Map` com a versão de cada recurso;
  - ignora duplicatas e versões menores ou iguais à atual;
  - anuncia as mudanças numa região `aria-live="polite"`.
- **Reconexão** (`connect` depois de um `disconnect`): invalida as queries ativas de catálogo, detalhe,
  carrinho, cotação e pedido pendente, reconciliando com o REST.
- **Logout ou troca de usuário:**
  - desconecta o socket e remove os listeners;
  - roda `queryClient.removeQueries({ queryKey: ['me'] })`;
  - cancela as requisições em andamento.

### Estado e cache (documentar no ARCHITECTURE.md)

- **Query keys:**
  - públicas: `['nfts','list',params]` e `['nfts','detail',id]`;
  - privadas, sempre com o id do usuário: `['me', userId, 'favorites' | 'cart' | 'profile' | 'wallets' | 'orders', ...]`;
  - carrinho de visitante: `['cart','guest',cartId]`.
- **`staleTime`:** catálogo 30 s, detalhe 15 s, carrinho e cotação 0.
- **Listagem:** `placeholderData: keepPreviousData`, com um indicador de atualização em segundo plano.
- **Respostas obsoletas:** passe o `signal` do TanStack Query para o Axios. Isso cancela respostas
  obsoletas, e as que chegarem fora de ordem caem na key antiga.
- **Retries:** queries tentam até 2 vezes, só em erro de rede ou 5xx, nunca em 4xx. Mutations não têm
  retry automático; a exceção é a criação de pedido, que reenvia com a mesma `Idempotency-Key`.
- **Timeout do Axios:** 10 s, feito com `AbortController` + `setTimeout` em vez do `timeout` nativo do
  XHR, para o `page.clock` do Playwright conseguir controlar o relógio.
- **Atualização otimista:** nos favoritos (`onMutate`, rollback no `onError` e `invalidateQueries` no `onSettled`).
- **Busca:** debounce de 300 ms e `replace: true` na URL. Mudar qualquer filtro volta para `page=1`.

### Checkout e pedido

- **Idempotência:**
  - cada tentativa de compra tem uma `Idempotency-Key` (UUID), guardada no `sessionStorage` junto com o hash do body;
  - reenvio, timeout e duplo clique reutilizam a mesma chave;
  - chave nova só depois que o usuário reconfirma uma cotação nova.
- **Revalidação antes de confirmar:** busque uma cotação nova. Se mudou preço, disponibilidade, cupom ou
  taxa, mostre o que mudou e exija nova confirmação.
- **Botão travado** enquanto a mutation estiver pendente.
- **Pedido pendente** salvo no `localStorage` (`kurio.pendingOrder`). No boot ou ao reconectar, o app faz
  `GET /orders/:id` e retoma de onde parou.
- **Recibo:** é o snapshot gravado no pedido. Mudanças posteriores no catálogo não alteram o recibo.
- **Carrinho depois da compra:** na confirmação, o mock tira do carrinho só os itens e quantidades
  comprados. Se a compra falhar, o carrinho fica intacto.
- **Sessão expirada no checkout:**
  - salve o rascunho (dados e carteira) no `sessionStorage`;
  - mande para `/login?redirect=/checkout&reason=expired`;
  - restaure o rascunho quando o usuário voltar.
- **Checkout mobile:** não há formulário. Os dados do colecionador vêm do perfil, mais a carteira escolhida.
  Se faltar algum campo obrigatório, abra um sheet pedindo só o que falta. Documentar essa decisão.

### Camada de mocks

- **Banco:** em memória, com seed determinística e persistido no `localStorage` (`kurio.mockdb.v1`).
  O `reset()` restaura o cenário por inteiro.
- **Fixtures de NFTs:**
  - pelo menos 40 NFTs, para ter 5 páginas de 9;
  - distribuídos pelas 9 coleções e 3 redes do Figma;
  - preços entre 0.02 e 12.30 ETH;
  - edições 1/1, 1/10, 1/50 e Aberta, com estoque e pelo menos uma esgotada;
  - usam as 4 imagens de `public/nfts/` e os nomes de `docs/figma-notes.md`;
  - as contagens dos filtros são calculadas a partir dos dados.
- **Usuários:** `colecionador@kurio.test` e `curadora@kurio.test`, ambos com a senha `Kurio@2026`
  (documentar no README). O primeiro já vem com carteira principal (`0xA91F…E82C`, Ethereum) e
  secundária (`nova.kurio.eth`, Polygon).
- **Cupons:** `KURIO10` (10%), `GENESIS5` (5%) e `EXPIRADO` (expirado). Qualquer outro código é inválido.
- **Taxa de rede:** Ethereum 0.016, Polygon 0.002 e Solana 0.001 ETH.
- **Cenários:** escolhidos por `?scenario=` na URL, pelo painel "Cenários" ou por `window.__kurio.setScenario()`,
  e guardados no `localStorage`.

  | Cenário | O que simula |
  | --- | --- |
  | `default` | Latência de 50–150 ms; o pagamento confirma em ~2 s |
  | `slow` | Latência de 1,5–3 s |
  | `flaky` | 30% das respostas com 503, sorteadas pela seed |
  | `offline` | Falha de conexão (`HttpResponse.error()`) |
  | `out-of-order` | Buscas mais curtas demoram mais |
  | `empty` | Catálogo vazio |
  | `session-expired` | Sessão expira durante o uso |
  | `signup-conflict` | Conflito de e-mail ou usuário no cadastro |
  | `coupon-expired` | Cupom expirado |
  | `price-change` | O preço de um item do carrinho sobe quando o usuário entra no checkout |
  | `sold-out` | Uma edição esgota durante a compra |
  | `order-timeout` | O pedido é criado, mas a resposta demora mais que o timeout do cliente |
  | `payment-declined` | O pagamento é recusado |
  | `socket-drop` | O socket cai por 5 s com o pedido pendente |
  | `duplicate-events` | Cada evento chega duas vezes, mais uma versão antiga |

- **Aleatoriedade:** sempre por PRNG com seed (`?seed=`).
- **`window.__kurio`:** existe só com os mocks ligados, e o app nunca o chama. Expõe `reset`,
  `setScenario`, `setLatency`, `emitNftUpdate`, `dropSocket` e `expireSession`. É assim que os testes
  disparam eventos, sempre passando pelo `socket.io-client`.
- **Painel "Cenários":** botão flutuante acessível, carregado sob demanda.
- **REST e eventos andam juntos:** toda mudança nos dados do mock grava no banco e emite o evento. Por
  exemplo, mudar um preço grava no banco, incrementa a `version` e emite `nft.updated`.

### Interface

- **Breakpoints:**
  - abaixo de 768 px: design mobile, com cara de app;
  - de 768 a 1023 px: design desktop, com os filtros num drawer e grid de 2 colunas;
  - a partir de 1024 px: desktop completo, com container de 1200 px.
- **Header logado:** troque "Entrar" por avatar + menu (Perfil, Carteiras, Sair), no mesmo estilo visual.
- **Itens fora do escopo** (lista em `docs/figma-notes.md`): ficam desabilitados, com "Em breve".
- **Hero:** conteúdo editorial estático, com a imagem pré-carregada (`fetchpriority="high"`), para o LCP
  não depender do boot dos mocks. Os destaques com dados ("NFT em destaque" e a aba "Em alta") vêm de
  `GET /nfts/featured`. Documentar essa decisão.
- **Imagens:** `<picture>` com AVIF + WebP e `srcset` 320/640/1024, `width` e `height` fixos e
  `loading="lazy"` abaixo da dobra.
- **Defeitos do Figma:** não replicar (a lista está em `docs/figma-notes.md`).
- **Acessibilidade:**
  - foco visível e focus trap em dialogs e drawers (o Radix já faz);
  - labels nos campos e `aria-describedby` nas mensagens de erro;
  - `aria-live` para mutations e eventos em tempo real;
  - estados que não dependem só de cor;
  - respeito a `prefers-reduced-motion`;
  - sem overflow horizontal em 390 px nem com zoom de 200%.

## Fases

### Fase 1 — Fundação e risco técnico (alvo: qui 16h–18h30)

1. **Scaffold:** Vite + React + TS strict, a stack instalada, Tailwind v4 com `src/styles/theme.css`,
   shadcn, fontes e ESLint.
2. **Scripts:** `dev`, `build`, `preview`, `typecheck`, `lint`, `test:e2e`, `test:e2e:update` e `lighthouse`.
3. **Router:** layout raiz (header e footer simplificados) e página 404.
4. **MSW:** `boot.ts` com `mocksReady`, um `GET /api/nfts` mínimo, o socket com o código de referência e
   `window.__kurio.emitNftUpdate`.
5. **Playwright:**
   - projetos `desktop` (1440×900) e `mobile` (390×844), ambos no Chromium;
   - `trace: 'retain-on-failure'` e relatório HTML;
   - um smoke test cobrindo três coisas: a home carrega dados do mock, a 404 funciona e um `nft.updated`
     disparado pelo `__kurio` chega na interface.
6. **Deploy:**
   - crie o `vercel.json`, faça commit e push;
   - **peça ao Jordan para importar o repositório na Vercel** (vercel.com → Add New → Project → Deploy)
     e mandar a URL;
   - rode o smoke test contra a URL pública (`BASE_URL=...`) e confira o refresh numa rota interna.
7. **Medição:** uma rodada rápida do Lighthouse mobile na home, para medir o custo do boot do MSW.
   Anote o resultado em `docs/PROGRESSO.md`.

**Pronto quando:** o deploy público funciona com REST e socket mockados, e o smoke test passa tanto
local quanto contra a URL.

### Fase 2 — Contratos e backend simulado (alvo: qui 18h30–22h30)

1. Schemas Zod de todos os recursos e do envelope de erro, em `src/shared/contracts`.
2. `src/shared/money`, com testes unitários:
   - conversão de string decimal para bigint (wei) e de volta;
   - soma e multiplicação por inteiro;
   - percentual com a regra de arredondamento documentada;
   - formatação para exibição.
3. Banco do mock, seed, persistência, reset e todos os handlers REST da seção de contratos.
4. Servidor de eventos (`nft.updated` e `order.updated`), com registro de clientes por usuário, versões
   e o processamento do pedido.
5. Cenários, condições de rede, PRNG, `window.__kurio` e o painel "Cenários".
6. `docs/API.md` com os contratos e os eventos. Depois ele entra no ARCHITECTURE.md.

**Pronto quando:** todos os endpoints respondem conforme o contrato (valide com os schemas), os
cenários podem ser escolhidos e o reset restaura tudo.

### Fase 3 — Catálogo e detalhe (alvo: sex 8h30–12h)

1. **Layout:** header (com busca e badge do carrinho), footer e tab bar mobile.
2. **Início, desktop e mobile, fiel aos frames:**
   - hero;
   - filtros combináveis (coleção, preço e rede), abas, ordenação, paginação e busca, tudo na URL;
   - skeletons, estado vazio e estado de erro com "Tentar de novo";
   - "Diário da Cunhagem" estático.
3. **Detalhe, desktop e mobile:**
   - galeria, edições e quantidade com limite;
   - favoritar com atualização otimista (sem login, leva ao login);
   - comprar e adicionar ao carrinho;
   - NFT inexistente, edição indisponível e relacionados.
4. `nft.updated` refletindo no catálogo e no detalhe.
5. E2E: cenários 1, 2 e 12 do enunciado.

### Fase 4 — Conta e carrinho (alvo: sex 13h–16h)

1. **Login e cadastro:**
   - dialog no desktop e página no mobile;
   - validação, conflito e retorno ao fluxo anterior;
   - sessão recuperada no refresh e expiração durante a navegação;
   - logout limpando o cache e o socket.
2. **Carrinho, desktop e mobile:**
   - quantidades com limite e remoção;
   - cupom, incluindo inválido e expirado;
   - resumo vindo da cotação;
   - persistência no refresh e merge do carrinho de visitante no login;
   - aviso de preço e disponibilidade em tempo real.
3. E2E: cenários 3, 4 e 5.

### Fase 5 — Checkout, pedido e confirmação (alvo: sex 16h–20h)

1. **Pagamento:** no desktop, o formulário do Figma e a etapa de revisão; no mobile, a seleção de carteira.
2. **Carteiras:** usar as cadastradas, escolher a rede e simular a conexão (aprovada, recusada e desconectada).
3. **Pedido:**
   - revalidação antes de confirmar;
   - idempotência, duplo clique e timeout com recuperação;
   - estados pendente, confirmado e recusado, com retomada após refresh ou reconexão;
   - recibo (o modal do Figma) na rota `/pedidos/$orderId`;
   - carrinho perdendo só os itens comprados.
4. E2E: cenários 6, 7, 9 e 10. Use `page.clock` onde houver espera de tempo.

### Fase 6 — Perfil e carteiras (alvo: sex 20h30–22h30)

1. **Perfil:** dados, avatar (alterar e remover), alteração de senha e erros da API exibidos nos campos.
2. **Carteiras:** principal e secundária (com "Igual à principal") e validação.
3. Versões mobile, mesmo sem frame, no mesmo padrão visual.
4. E2E: cenário 8.

### Fase 7 — Testes finais e regressão visual (alvo: sáb 7h30–9h30)

1. E2E do cenário 11: teclado, foco em dialogs e validação de formulários.
2. Regressão visual com `toHaveScreenshot`:
   - telas: início, detalhe, carrinho e pagamento, em desktop e mobile;
   - configuração: seed fixa, `animations: 'disabled'` e `reducedMotion: 'reduce'`.
3. **Baselines:** o Jordan está no Windows. Se houver Docker, gere as baselines na imagem oficial do
   Playwright (Linux). Se não houver, gere localmente e documente no README como regenerar.
4. Rode tudo nos dois projetos, elimine testes instáveis e garanta que cada teste parte de um estado isolado.

### Fase 8 — Lighthouse, documentação e entrega (alvo: sáb 9h30–11h30)

1. **Lighthouse:**
   - versione os `lighthouserc` de mobile e de desktop;
   - rode 3 vezes por página (início e detalhe) e por perfil, em `vite preview` com o cenário `default`;
   - um script calcula a mediana de cada categoria, mais LCP, CLS e TBT, e grava
     `lighthouse/SUMMARY.md` com as versões das ferramentas e o ambiente;
   - corrija o que for barato e justifique o que ficar abaixo da meta.
2. **`README.md`:** setup, variáveis de ambiente, credenciais, cenários e reset, comandos e como
   reproduzir cada falha.
3. **`ARCHITECTURE.md`:**
   - contratos e eventos;
   - política de sessão, estado do carrinho e estratégia de cache;
   - reconciliação entre REST e Socket.IO;
   - limitações do binding (itens 6 e 7 das armadilhas);
   - decisões de UX e desvios do Figma, a partir de `docs/figma-notes.md` e `docs/PROGRESSO.md`.
4. **Checklist final:**
   - a partir de um checkout limpo, `git clone` + `npm ci` + `npm run build` funcionam;
   - a URL pública roda com os mocks e o socket;
   - o refresh numa rota interna funciona;
   - todos os comandos do README rodam.

## Plano B (se a Fase 5 não estiver pronta na sexta às 20h)

**Nunca cortar:**
- a compra de ponta a ponta, confirmada pela simulação;
- o isolamento de dados entre usuários;
- os eventos passando pelo `socket.io-client`;
- os testes E2E executáveis.

**Cortar nesta ordem:**

1. Carrosséis "Mais desta coleção" e "Colecionadores também viram".
2. "Diário da Cunhagem" e promo cards (deixar uma versão estática simples).
3. Polimento de tablet (só garantir que não quebra).
4. Regressão visual no mobile (manter a do desktop).
5. Avatar (manter dados e senha).
6. Lighthouse desktop (manter o mobile).

Registre cada corte no ARCHITECTURE.md, dizendo o que seria feito com mais tempo.
