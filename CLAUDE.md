# Kurio — desafio frontend da Jungle Gaming

Este arquivo leva o contexto de uma conversa no claude.ai (29/10/2026), onde o enunciado e o Figma
foram analisados e o plano foi montado.

## Como trabalhar comigo

- Sou o Jordan, dev front-end sênior (React + TypeScript, 5+ anos). Vamos trabalhar em par:
  você implementa em passos pequenos e explica as decisões em poucas linhas.
- Quero respostas curtas e diretas, em português.
- **O plano está em `docs/PLANO.md` e as decisões dele já valem.** Siga sem me perguntar. Só pergunte
  se algo bloquear ou se precisar desviar do plano.
- Uso Windows. Commits pequenos e frequentes.
- Registre o andamento em `docs/PROGRESSO.md`, criando o arquivo na primeira fase. Assim qualquer
  sessão nova (depois de um `/clear`, por exemplo) retoma de onde a anterior parou.
- Na primeira sessão, pergunte uma única vez se o recrutador já respondeu (prazo fixo? entrega
  parcial aceita? pode usar IA?). Se não respondeu, siga o plano.

## O desafio

- **Enunciado completo:** `docs/CHALLENGE.md`, cópia do README de
  https://github.com/junglegaming/frontend-challenge. Leia antes de começar.
- **O que é:** um marketplace de NFTs ("Kurio") com 9 telas (início, detalhe, carrinho, pagamento,
  confirmação, login, cadastro, perfil, carteiras), em desktop e mobile. A API é toda simulada com
  MSW, e o tempo real usa Socket.IO, também mockado pelo MSW.
- **Figma:** os achados estão em `docs/figma-notes.md` e os frames exportados em `design/frames/`.
  Abra os PNGs para conferir a fidelidade visual.
- **Prazo:** sábado, 31/10/2026, por volta das 12h (horário de Brasília).

## Stack obrigatória

React, TypeScript, TanStack Router, TanStack Query, Axios (REST), Socket.IO, Tailwind, shadcn/ui,
MSW, Playwright (E2E e regressão visual) e Lighthouse. O deploy é obrigatório (Vercel) e os mocks
precisam funcionar no build publicado.

## Como a nota funciona

- **Pontos (total 100):**
  - fidelidade visual e responsividade: 20;
  - fluxos e experiência: 20;
  - integração e estado: 15;
  - tempo real: 10;
  - mocking: 10;
  - testes: 10;
  - acessibilidade: 5;
  - performance: 5;
  - arquitetura e documentação: 5.
- **Eliminatórios:**
  - stack obrigatória sem uso efetivo;
  - fluxos principais só visuais;
  - compra confirmada sem resposta da simulação;
  - dados vazando entre usuários;
  - eventos simulados direto na UI, sem passar pelo `socket.io-client`;
  - falta de testes E2E executáveis.

## Armadilhas técnicas

Ficam na seção "Armadilhas já verificadas" do `docs/PLANO.md`, que tem também código de referência
testado. A mais importante: use **`msw` 2.x** com a API `toSocketIo` do `@mswjs/socket.io-binding@0.2.0`.
O README do binding no GitHub descreve uma versão que ainda não foi publicada no npm.

## Arquivos já prontos

- `docs/PLANO.md`: decisões de arquitetura, as 8 fases com horário-alvo e critério de pronto, e um plano B.
- `docs/CHALLENGE.md`: o enunciado.
- `docs/figma-notes.md`: telas, defeitos do Figma que não devem ser replicados, itens fora do
  escopo, dados para os fixtures e notas de acessibilidade.
- `src/styles/theme.css`: tema Tailwind v4 + shadcn com os tokens do Figma (cores, Roboto Mono,
  escala de texto, raios, sombras, container de 1200 px e utilitário `skeleton`). Compila no Tailwind 4.3.3.
- `public/nfts/`: as 4 imagens do `.fig` em AVIF e WebP, em 320, 640 e 1024 px.
- `design/frames/`: PNGs dos 15 frames (9 desktop e 6 mobile).
