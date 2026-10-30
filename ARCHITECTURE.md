# Arquitetura — Kurio

Este documento explica como o app está organizado e por quê. Os contratos completos (cada endpoint, payload e
código de erro) estão em [`docs/API.md`](docs/API.md). Os comandos e cenários estão no [`README.md`](README.md).

## Visão geral

```
           ┌────────────── navegador ──────────────────────────────────────────┐
 rotas ──► │ TanStack Router ──► telas (features/*) ──► TanStack Query (cache)  │
           │                                         │            ▲           │
           │                         Axios (/api) ◄──┘            │ setQueriesData / invalidate
           │                              │          socket.io-client ──► processador de eventos
           │                              ▼                 │
           │           Service Worker do MSW (REST)    WebSocket interceptado pelo MSW
           │                              │                 │
           │                              └──► src/mocks ◄──┘  banco em memória + localStorage,
           │                                                  cenários, emissores de eventos
           └───────────────────────────────────────────────────────────────────┘
```

- **Regra central:** componentes, hooks e o cliente Axios não contêm dado fictício nem caminho alternativo de
  negócio. Todo dado simulado nasce em `src/mocks/`. Desligar `VITE_ENABLE_MOCKS` faz o mesmo código chamar `/api`
  e o socket reais.
- **Contratos compartilhados:** `src/shared/contracts/` tem os schemas Zod usados pelo app (validação de
  formulários e tipos) e pelos mocks (formato das respostas). O `e2e/api-contract.spec.ts` valida cada
  endpoint contra esses schemas, passando pelo service worker.
- **Dinheiro:** ETH trafega como string decimal canônica (`"2.5"`) e toda conta é feita em wei com `bigint`
  (`src/shared/money/`). O cliente não soma preços: subtotal, desconto, taxa e total vêm da API.

### Pastas

| Pasta | Conteúdo |
| --- | --- |
| `src/app/` | `boot.ts` (`mocksReady`), providers, `queryClient`, router |
| `src/routes/` | Uma rota por arquivo (TanStack Router, `autoCodeSplitting`) |
| `src/features/<x>/` | `api.ts` (Axios), `queries.ts` (`queryOptions` e mutations) e `components/` |
| `src/shared/` | `contracts`, `api` (Axios + `ApiError`), `realtime`, `money`, `ui` |
| `src/mocks/` | `db` (seed, store, persistência), `handlers` (REST), `realtime` (Socket.IO), `scenarios`, `devtools` |

### Boot

O primeiro render não espera os mocks. `src/app/boot.ts` exporta `mocksReady`, que resolve depois do
`worker.start()`. O shell, o hero e os skeletons aparecem na hora; só o interceptor do Axios e o gerenciador do
socket aguardam essa promise. O chunk do MSW (~170 kB gzip) é importado dinamicamente e fica fora do caminho
crítico.

## Rotas

| Rota | Tela | Observação |
| --- | --- | --- |
| `/` | Início | Filtros, abas, ordenação, busca e página na URL (`validateSearch` com Zod + `stripSearchParams`) |
| `/nft/$nftId` | Detalhe | `?edition=` opcional; telas próprias de 404, erro e skeleton |
| `/carrinho` | Carrinho | Pública (carrinho de visitante) |
| `/checkout` | Pagamento | Protegida |
| `/pedidos/$orderId` | Processando, recusado ou recibo | Protegida; o recibo só aparece com `confirmed` |
| `/login`, `/cadastro` | Autenticação | `?redirect=` (só caminhos internos) e `?reason=expired`. Dialog a partir de 1024 px, página abaixo |
| `/perfil`, `/perfil/carteiras`, `/perfil/favoritos` | Conta | Protegidas |

As rotas protegidas fazem `redirect({ to: '/login', search: { redirect } })` no `beforeLoad`. Os loaders só
fazem prefetch, sem `await`, e as telas usam `useQuery` com skeletons do tamanho do conteúdo.

## Contratos e eventos

Resumo (o detalhe está em [`docs/API.md`](docs/API.md)):

- **Envelope de erro:** `{ error: { code, message, fields?, quote? } }`. O Axios converte tudo em `ApiError`
  (`code`, `status`, `fields`, `quote`, `retryAfterMs`, `isTransient`). Códigos: `VALIDATION_ERROR` (400/422),
  `UNAUTHENTICATED`/`SESSION_EXPIRED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT`, `OUT_OF_STOCK`,
  `QUOTE_STALE`, `IDEMPOTENCY_CONFLICT` (409) e `UNAVAILABLE` (503 + `Retry-After`).
- **Recursos:** sessão, NFTs (lista paginada com facetas, destaques, detalhe com edições, relacionados), favoritos,
  carrinho (usuário ou visitante via `X-Cart-Id`, com `merge` no login), cotação, pedidos com `Idempotency-Key`,
  perfil, avatar, senha, carteiras e sessão de carteira.
- **Eventos Socket.IO**, com o envelope `{ eventId, type, resource: { type, id }, version, occurredAt, userId?, data }`:
  - `nft.updated`: `data.editions[{ id, priceEth, available }]`, para todos os sockets;
  - `order.updated`: `data.status` e, se confirmado, o recibo. Só vai para os sockets do dono.

## Sessão

- **Token Bearer no `localStorage`** (`useToken` com `useSyncExternalStore`, reativo também entre abas). Em
  produção seria um cookie `httpOnly` + `SameSite`, fora do alcance de scripts; aqui não há servidor para
  emiti-lo. O mock guarda as senhas com PBKDF2 (WebCrypto).
- **Sessão expirada:** qualquer 401 `SESSION_EXPIRED` (ou `UNAUTHENTICATED` com token salvo), em query ou
  mutation, passa pelo `QueryCache`/`MutationCache`. O `SessionWatcher` limpa a sessão e leva a
  `/login?redirect=<tela atual>&reason=expired`; depois do login o usuário volta para a mesma tela. No checkout,
  o rascunho (dados, carteira e rede) fica no `sessionStorage` por usuário e é restaurado.
- **Login, logout e troca de usuário** (isolamento de dados):
  - cancela as requisições privadas e remove tudo sob `['me']` e `['session']`;
  - no login, faz o merge do carrinho de visitante com o token explícito **antes** de publicá-lo, para nenhuma
    query buscar o carrinho antes do merge, e gira o `X-Cart-Id`;
  - fecha o socket (e os listeners) e abre outro com o token novo; o servidor só manda `order.updated` ao dono,
    e o cliente também descarta eventos cujo `userId` não é o da sessão atual.

## Carrinho

- O carrinho é estado do servidor: o cliente não guarda itens, só o `X-Cart-Id` do visitante. Toda mutation
  devolve o carrinho inteiro e substitui o cache; o resumo (subtotal, desconto, taxa estimada, total) é o que a
  API calcula.
- Quantidade limitada ao estoque e a 10 por item. Se o estoque cai abaixo da quantidade, a linha avisa, só deixa
  diminuir e "Conectar e finalizar" fica bloqueado até ajustar.
- Na confirmação de um pedido, o mock tira do carrinho só os itens e quantidades comprados. Compra recusada não
  mexe no carrinho.

## Estratégia de cache

| Query key | `staleTime` | Observação |
| --- | --- | --- |
| `['nfts', 'list', params]` | 30 s | `placeholderData: keepPreviousData` + indicador "Atualizando resultados…" |
| `['nfts', 'detail', id]` | 15 s | |
| `['nfts', 'featured']`, `['nfts', 'related', id]` | 30 s | |
| `['session', token]` | — | Dá o `userId` das keys privadas |
| `['me', userId, 'cart' \| 'favorites' \| 'profile' \| 'wallets']` | 0–60 s | Privadas, sempre com o id do usuário |
| `['cart', 'guest', cartId]` | 0 | Carrinho de visitante |
| `['me', userId, 'quote', network]` | 0 | Refeita ao entrar no checkout e invalidada por eventos |
| `['me', userId, 'orders', id]` | 0 até terminal, depois ∞ | Pendente é refeito no boot e na reconexão; terminal nunca muda |

- **Cancelamento:** o `signal` do TanStack Query vai para o Axios. Requisições obsoletas são canceladas, e uma
  resposta fora de ordem cai na key antiga (cenário `out-of-order`).
- **Retries:** queries tentam até 2 vezes, só em erro de rede ou 5xx (`ApiError.isTransient`), nunca em 4xx.
  Mutations não têm retry; a exceção é a criação de pedido, que reenvia **uma vez** com a mesma `Idempotency-Key`.
- **Timeout:** 10 s com `AbortController` + `setTimeout` (não o `timeout` do XHR), para o `page.clock` do
  Playwright controlar o relógio.
- **Otimista:** favoritos (`onMutate`, rollback no `onError`, `invalidateQueries` no `onSettled`), anunciado no
  `aria-live`.
- **Busca:** debounce de 300 ms; o primeiro termo cria uma entrada no histórico e o refinamento a substitui.
  Mudar qualquer filtro volta para a página 1.

## Checkout e pedido

- **Idempotência:** cada tentativa tem uma `Idempotency-Key` (UUID) no `sessionStorage`, junto com o hash do
  corpo. Duplo clique, timeout e "Tentar de novo" reutilizam a chave; só uma cotação nova reconfirmada gera
  chave nova. No mock, mesma chave + mesmo corpo devolve o mesmo pedido; corpo diferente dá
  `IDEMPOTENCY_CONFLICT`.
- **Revalidação:** "Confirmar compra" valida o formulário, exige carteira conectada, refaz a cotação e abre a
  revisão ("Pagar X ETH"). Se preço, quantidade, itens, cupom, taxa ou total mudaram (por evento, revalidação ou
  `QUOTE_STALE`, que já traz a cotação nova), a tela lista o que mudou e trava a compra até "Aceitar novos
  valores". Item sem estoque trava com "Ajustar o carrinho".
- **Botão travado** enquanto a mutation está pendente.
- **Pedido pendente:** salvo em `kurio.pendingOrder` (`localStorage`). O `PendingOrderWatcher`, no layout raiz,
  busca o pedido no boot e na reconexão, limpa o registro quando ele termina, invalida carrinho e cotação e mostra
  um toast "Ver recibo" se o usuário estiver em outra tela. Com pedido pendente, o checkout não deixa comprar de novo.
- **Recibo:** snapshot gravado no pedido; mudanças posteriores no catálogo não o alteram.
- **A compra só é confirmada pela simulação:** a tela de recibo depende do status `confirmed` vindo do REST ou do
  `order.updated`; não existe caminho no cliente que marque um pedido como pago.

## Reconciliação entre REST e Socket.IO

- **No mock**, toda mudança grava no banco, incrementa a `version` do recurso e emite o evento. O REST e o socket
  nunca divergem; o socket só antecipa o que o REST já devolve.
- **Processador no cliente** (`src/shared/realtime/`):
  - descarta `eventId` já visto (LRU de ~500) e versões menores ou iguais à conhecida por recurso;
  - `nft.updated` atualiza com `setQueriesData` todas as listas, destaques, relacionados, favoritos e o detalhe
    (cada edição com versão própria), anuncia mudança de preço/estoque no `aria-live`, gera os avisos do carrinho
    ("O preço de X mudou de A para B") e invalida carrinho e cotação;
  - `order.updated` atualiza o pedido se for do usuário atual e não estiver em estado terminal.
- **Reconexão** (`connect` depois de um `disconnect`): invalida as queries ativas de catálogo, detalhe, carrinho,
  cotação e pedido pendente. O que se perdeu durante a queda é recuperado pelo REST (testado no cenário 10: o
  `order.updated` se perde na queda e o pedido aparece confirmado na reconexão).

## Limitações do binding de Socket.IO

O `@mswjs/socket.io-binding@0.2.0` (último no npm) com `msw@2.x` tem lacunas que o app contorna:

1. **Sem ping do Engine.IO.** O binding anuncia `pingInterval 25000 / pingTimeout 5000`, mas nunca envia ping, e o
   cliente cairia a cada ~30 s. O servidor do mock manda o pacote de ping (`'2'`) a cada 20 s e limpa o intervalo
   no `close`.
2. **Sem `auth` nem acks nem namespaces.** O binding aprova o CONNECT sozinho e não expõe o payload de `auth`, então
   o token vai na `query` (`io(url, { query: { token } })`) e o mock lê `connection.client.url.searchParams`.
   Em produção, prefira `auth` (não fica em logs de URL).
3. **Recusar ou derrubar conexão** só com `connection.client.close()`. Fechar antes do handshake deixava o cliente
   pendurado até o timeout de 20 s do Manager; por isso o `dropSocket` deixa a conexão abrir e a fecha no tick
   seguinte (o cliente vê `connect` + `transport close` e reconecta quando a queda acaba).
4. Outras armadilhas de integração: `ws.link` recebe só a origem (sem `/socket.io/`), o cliente usa
   `transports: ['websocket']` (polling dá `xhr poll error`) e o `socket.io-client` é importado dinamicamente
   depois do `worker.start()`, porque o `engine.io-client` guarda `globalThis.WebSocket` ao ser avaliado.

## Camada de mocks

- **Banco** em memória com seed determinística (42 NFTs em 9 coleções e 3 redes, 2 usuários, carteiras, favoritos),
  persistido em `kurio.mockdb.v1`. As contagens dos filtros são calculadas dos dados.
- **Cenários** por `?scenario=`, painel ou `window.__kurio`; aleatoriedade sempre por PRNG com seed, sorteada por
  requisição (seed + método + URL + ocorrência), então o resultado não depende do resto do tráfego.
- **`window.__kurio`** existe só com os mocks ligados e o app nunca o chama. Os testes disparam eventos por ele,
  e os eventos chegam pelo `socket.io-client`, nunca direto na UI.

## Testes

- **E2E (Playwright)** nos projetos `desktop` (1440×900) e `mobile` (390×844), contra `build + preview` local ou
  contra o deploy (`BASE_URL`). Cobrem os 12 cenários do enunciado, o contrato de cada endpoint e teclado/foco.
  Cada teste parte de um contexto novo (banco da seed).
- **Regressão visual** de início, detalhe, carrinho e pagamento, com baselines geradas no Docker (Linux) para não
  depender da renderização de fontes do sistema.
- **Lighthouse:** medianas em [`lighthouse/SUMMARY.md`](lighthouse/SUMMARY.md).

## Decisões de UX

- **Dois layouts só**, separados em 1024 px (`lg:`): abaixo disso vale o design mobile, com cara de app (inclui
  tablet). A partir de 1024 px, desktop com container de 1200 px.
- **Hero estático** com a imagem pré-carregada (`fetchpriority="high"` no `index.html`), para o LCP da home não
  depender do boot dos mocks. Os destaques com dados ("NFT em destaque", aba "Em alta") vêm de `/nfts/featured`.
- **Login desktop** abre como dialog sobre o hero da home (inerte); fechar volta ao `redirect`, ou à home se o
  destino for protegido.
- **Checkout mobile** não tem formulário: os dados do colecionador vêm do perfil, mais a carteira escolhida. Se
  faltar algo (ex.: ENS), um sheet pede só os campos que faltam.
- **Revisão antes de pagar:** etapa extra (não está no Figma), exigida pela revalidação da cotação.
- **Carteiras no checkout:** a API conecta as carteiras **cadastradas** (`POST /wallet-sessions { walletId }`),
  então a lista mostra as carteiras do usuário com o provedor como etiqueta, em vez da lista de provedores do Figma.
- **Edição inicial** do detalhe é a primeira com estoque. Se ela esgotar em tempo real, continua selecionada com
  o aviso, em vez de trocar sozinha.
- **Avatar** é salvo na hora (corte central, 256 px, WebP no canvas), sem depender do "Salvar".
- **Acessibilidade:** link "Pular para o conteúdo", foco preso e devolvido em dialogs e sheets (Radix), `<label>`
  em todos os campos (só para leitor de tela onde o Figma usa placeholder), erros com `aria-describedby` e foco no
  primeiro inválido, `aria-live` para mutations e eventos, estados que não dependem só de cor (checkbox nativo nos
  filtros, "Esgotado" em texto), `prefers-reduced-motion` e sem overflow horizontal em 390 px.
- **Itens fora do escopo** (Google/Facebook, "Esqueceu a senha?", newsletter, redes sociais, Criadores, Aprenda,
  "Ler mais", botão central da tab bar, Atividade/Ofertas/Arquivos/Suporte) ficam desabilitados com "Em breve".
  "Ver no Etherscan" é um link simulado.

## Desvios do Figma

**Defeitos do design que não foram replicados:**

- "2.29 ETH" órfão ao lado do Neon Vessel #552 (label duplicado) — removido.
- Chip "RARO" quadrado vazando do canto do card — segue o raio do card.
- Ivory Baron com IDs de token diferentes entre carrinho e pagamento, e totais que não fecham no carrinho mobile
  (8.14 vs 8.92) — tudo vem da API, então é consistente.
- Edições "1/10, 1/10, 1/50, Aberta" no mobile — são 1/1, 1/10, 1/50 e Aberta nos dois layouts.
- Header com "Entrar" em Perfil e Carteiras — logado, mostra avatar + menu (Perfil, Carteiras, Sair).
- "Código de indicação" obrigatório — é opcional.
- Formulário de Carteiras repetindo campos do pagamento — ficaram só apelido, rede, endereço e tipo.
- Desconto "(-) 00.00" — `(-) 0.00 ETH`.
- Texto do "Salvar carteira" encostado nas bordas — padding normal.
- Contagens dos filtros que não fecham — calculadas a partir dos fixtures.

**Ajustes e acréscimos:**

- Detalhe desktop: botão "Adicionar ao carrinho" ao lado de COMPRAR, e a trilha mostra o nome do NFT.
- Carrinho desktop: a linha mostra a edição (sem ela, duas edições do mesmo NFT ficariam iguais).
- "Compartilhar" virou "Copiar link" + "E-mail" (`mailto:`), que funcionam.
- A aba Avaliações mostra só nota e total (a API não tem comentários). A nota do Emerald Ape segue a API (4,5).
- Ícones −/+ do lucide (o Iconly não tem "Minus"); o resto é Iconly curved.
- Perfil: ENS e apelido da carteira são opcionais (conta nova não tem ENS); `.eth` como sufixo fixo, não select.
- Mobile: sem tab bar no carrinho, pagamento e detalhe (o rodapé tem o resumo/CTA/barra de compra, como nos
  frames); sem footer no carrinho, pagamento e login/cadastro. As abas da home usam 15 px para caber em 390 px.
- Rede no checkout: select no desktop (como no Figma), rádios no mobile.

## Cortes (prazo)

Registrados em 30/10, quando o projeto começou um dia atrasado. O que seria feito com mais tempo:

| Corte | Como ficou | Com mais tempo |
| --- | --- | --- |
| Layout de tablet | Abaixo de 1024 px vale o mobile | Layout intermediário (grid de 3 colunas, filtros em drawer lateral) |
| Carrosséis | Linhas estáticas de cards (destaques, "Mais desta coleção") | Carrossel acessível com scroll-snap e botões |
| Cenários `signup-conflict` e `coupon-expired` | Regras fixas do mock (e-mail existente, cupom `EXPIRADO`) | Cenários próprios no registro |
| Cenários `socket-drop` e `duplicate-events` | Helpers `dropSocket` e `emitDuplicates` do `window.__kurio` | Cenários que disparam sozinhos em intervalos |

Nenhum item do Plano B precisou ser cortado: "Diário da Cunhagem", promo cards, regressão visual mobile, avatar e
Lighthouse desktop foram entregues.

## Performance

Medianas e justificativas em [`lighthouse/SUMMARY.md`](lighthouse/SUMMARY.md). Pontos de arquitetura:

- Rotas com code splitting automático; MSW e `socket.io-client` em imports dinâmicos fora do caminho crítico.
- `react-iconly` resolvido pelo build ESM fatiado (alias no `vite.config.ts`): o campo `module` do pacote aponta
  para um bundle com todos os ícones (~470 kB), e o tree-shaking não funcionava.
- Imagens em `<picture>` AVIF + WebP com `srcset` 320/640/1024, `width`/`height` fixos e `lazy` abaixo da dobra.
- Fontes self-hosted (`@fontsource`), só os pesos usados, com `font-display: swap`.
- O `cn` (merge de classes) é configurado com a escala de texto do tema. Sem isso, `text-caption` e afins eram
  tratados como cor e removiam a cor vizinha (o que gerava texto claro sobre cobre, com contraste 2,5:1).
