# Notas do Figma — Kurio

Tiradas da cópia do arquivo "Frontend Challenge" (exportada em 29/10/2026): o `.fig` decodificado
e os PNGs dos frames, que estão em `design/frames/`. Os tokens já estão em `src/styles/theme.css`.

## Frames

| Tela | Desktop (1440) | Mobile (414×896) |
| --- | --- | --- |
| Início | `desktop/inicio.png` | `mobile/inicio.png` |
| Detalhes do NFT | `desktop/detalhes-nft.png` | `mobile/detalhes-nft.png` |
| Carrinho | `desktop/carrinho.png` | `mobile/carrinho.png` |
| Pagamento | `desktop/pagamento.png` | `mobile/pagamento.png` |
| Confirmação | `desktop/confirmacao.png` (modal) | — |
| Login | `desktop/login.png` (modal sobre a home) | `mobile/login.png` (página) |
| Cadastro | `desktop/cadastro.png` (modal sobre a home) | `mobile/cadastro.png` (página) |
| Perfil | `desktop/perfil.png` | — |
| Carteiras | `desktop/carteiras.png` | — |

Não há frame de tablet (768). Perfil, Carteiras e Confirmação precisam funcionar no mobile mesmo sem frame.

## Layout desktop

- Container de 1200px centralizado (120px de margem em 1440). Header com 45px de altura.
- Header: logo KURIO; nav Início, Mercado, Criadores, Aprenda, com sublinhado cobre na ativa;
  busca; carrinho com badge; botão "Entrar". O estado logado não foi desenhado.
- Footer igual em todas as telas: 3 medalhões (W, C, D) + newsletter, faixa da marca (#38220F)
  com contato e 4 colunas de links, com chips de redes sociais e carteiras.
- **Início:** hero com carrossel (3 pontos). Sidebar de filtros com 310px: Coleções com contagem,
  Faixa de preço com slider duplo + Aplicar, Rede. Card "NFT em destaque / Oferta limitada".
  Grid de 3 colunas com abas (Todos os NFTs, Novos lançamentos, Em alta) e "Ordenar por".
  Paginação, 2 promo cards e o blog "Diário da Cunhagem" com 4 cards de 268px.
- **Card do catálogo:** no hover aparecem 3 ações (carrinho, favoritar, zoom). Tem também o chip "RARO".
- **Detalhe:**
  - galeria com 4 miniaturas e imagem principal com zoom;
  - título, preço e estrelas (19 avaliações);
  - Sobre, Edição (1/1, 1/10, 1/50, Aberta) e quantidade com −/+;
  - COMPRAR e Favoritar;
  - ID do token, coleção, atributos e compartilhar;
  - abas Detalhes / Avaliações e carrossel "Mais desta coleção".
- **Carrinho:**
  - tabela com NFT, Preço, Edições (−/+), Total e lixeira;
  - resumo com cupom + Aplicar, Subtotal, Desconto do lançamento, Taxa de rede ("Taxa estimada") e Total;
  - botões "Conectar e finalizar" e "Continuar explorando";
  - carrossel "Colecionadores também viram".
- **Pagamento:**
  - formulário "Perfil do colecionador": Nome de exibição*, Nome de usuário*, Rede* (select),
    Nome do perfil*, Endereço da carteira*, ENS ou carteira secundária (opcional),
    Tipo de carteira* (select), Código de indicação*, E-mail*, Nome ENS* (.eth),
    "Usar outra carteira?" e Observação (opcional);
  - coluna "Seus NFTs" com o resumo;
  - "Carteira e rede" (MetaMask, Coinbase Wallet) e "Confirmar compra".
- **Confirmação:** modal de 578px.
  - Ícone "Thank you" e o texto "Seus NFTs agora estão na sua carteira".
  - Faixa com ID da transação, Data, Total e Carteira.
  - Itens com edições e subtotal, taxa de rede e total.
  - Botão "Ver no Etherscan".
- **Login e Cadastro:** modal de 500px com abas "Entrar | Criar conta", botões Google/Facebook
  e "Esqueceu a senha?". O Cadastro tem Nome de usuário, E-mail, Senha e Confirmar senha.
- **Perfil:**
  - menu lateral: Dados do perfil, Carteiras, Atividade, Lista de interesse, Ofertas,
    Arquivos baixados, Suporte e Sair;
  - campos: Nome de exibição*, Nome de usuário*, E-mail*, Nome ENS*, Apelido da carteira*
    e Avatar (Alterar/Remover);
  - bloco Alterar senha (atual, nova, confirmar) e botão Salvar.
- **Carteiras:**
  - Carteira principal, com os mesmos campos do pagamento + Apelido, e "Salvar carteira";
  - Carteira secundária, com "Igual à carteira principal" e "Adicionar".

## Layout mobile

É outro design, com cara de app, e não o desktop empilhado:

- **Início:** campo "Explorar coleções" + botão de filtros, hero em card, abas e grid de
  2 colunas desencontrado (masonry) com coração e chip RARO. Embaixo, uma tab bar com
  Início, Favoritos, botão flutuante central, Carrinho e Perfil.
- **Detalhe:** imagem grande com voltar e favoritar, sheet com as informações e uma barra
  inferior com Qtd, preço, "Comprar NFT" e o botão de carrinho.
- **Carrinho:** cards de item e sheet de resumo com cupom em pílula, totais e
  "Conectar e finalizar" com gradiente.
- **Pagamento:** só escolhe a carteira. Em "Carteira conectada" aparecem Reserva e Principal;
  em "Carteira e rede", WalletConnect, MetaMask e Coinbase. Depois vêm o total e
  "Confirmar compra". **Não tem o formulário do desktop**: é preciso decidir de onde vêm
  os dados do colecionador (do perfil, por exemplo) e documentar.
- **Login e Cadastro:** página inteira, com o logo KURIO grande.

## Defeitos e inconsistências do Figma

Não replicar nenhum destes. Registrar no `ARCHITECTURE.md`.

- O "2.29 ETH" ao lado do Neon Vessel #552 é um **label duplicado órfão**, e não preço promocional.
  A própria descrição do componente "Marketplace Page" no Figma admite o bug.
- O chip "RARO" quadrado vaza do canto arredondado do card (bug também admitido na mesma descrição).
- O Ivory Baron #088 aparece como "ID do token: #0552" no carrinho e como #0088 no pagamento.
- No carrinho mobile os itens somam 8.14 ETH, mas a tela mostra 8.92.
- As edições no mobile aparecem como "1/10, 1/10, 1/50, Aberta" (1/10 duplicado; no desktop é 1/1).
- O header mostra "Entrar" até em Perfil e Carteiras.
- "Código de indicação" aparece como obrigatório no pagamento e em carteiras.
- O formulário de Carteiras repete campos do pagamento (nome de exibição, e-mail, nome do perfil).
- O desconto aparece como "(-) 00.00".
- O texto do botão "Salvar carteira" encosta nas bordas.
- O hero muda entre desktop ("…do futuro da arte digital") e mobile ("…da cultura digital").
- As contagens não fecham: Coleções somam 239 e Redes somam 283. As contagens devem vir da API,
  calculadas a partir dos fixtures.

## Fora do escopo, mas com UI visível

O enunciado exige que nada disto pareça funcionar. Sugestão: deixar desabilitado com "Em breve".

- Login com Google e Facebook, e "Esqueceu a senha?".
- Newsletter (Enviar) e links de redes sociais.
- Itens de nav Criadores e Aprenda, e o "Ler mais" do blog.
- Botão flutuante da tab bar no mobile.
- Itens do menu do perfil: Atividade, Ofertas, Arquivos baixados e Suporte.
- Exceção: o "Ver no Etherscan" pode ser um link simulado, porque o enunciado permite.

## Dados do design para os fixtures

- **NFTs e preços em ETH:** Emerald Ape #042 (1.19), Sage Nomad #009 (1.69), Neon Vessel #552 (1.99),
  Cosmic Bloom #118 (1.29), Violet Nomad #314 (1.39), Ivory Baron #088 (1.79), Golden Beat #207 (0.99),
  Golden Frequency #071 (0.59), Golden Signal #160 (0.39).
- **Coleção:** Kurio Apes / Kurio Editions. Atributos, por exemplo: Óculos, Esmeralda, Raro.
- **Imagens:** são só 4 distintas, em `public/nfts/ape-{emerald,nomad,golden,ivory}-{320,640,1024}.{avif,webp}`.
  - `emerald`: macaco marrom de óculos.
  - `nomad`: gorila cinza de chapéu (Sage Nomad, Violet Nomad, Cosmic Bloom).
  - `golden`: laranja de fone (Golden Beat, Golden Signal, Golden Frequency).
  - `ivory`: preto de blazer (Ivory Baron, Neon Vessel).
- **Coleções:** Arte digital, Fotografia, Música, Arte 3D, Colecionáveis, Generativa, Jogos,
  Assinaturas e Utilidade.
- **Redes:** Ethereum, Polygon e Solana.
- **Filtros e ordenação:** faixa de preço de 0,02 a 12,30 ETH; ordenação padrão "Listados recentemente".
- **Edições:** 1/1, 1/10, 1/50 e Aberta.
- **Taxa de rede:** 0.016 ETH, marcada como "Taxa estimada".
- **Carteiras:** MetaMask, WalletConnect e Coinbase Wallet. Exemplos de carteira salva:
  - "Reserva — nova.kurio.eth — Rede Polygon";
  - "Principal — 0xA91F…E82C — Rede principal Ethereum".
- **Recibo de exemplo:** transação 0xA91F…E82C, carteira MetaMask.

## Acessibilidade

- Texto: todos os pares de cor passam AA. O pior caso é #B0916A sobre #241612, com 5.93:1.
- Borda de input: a do Figma (#3F2319) tem 1.34:1 contra o fundo. Foi trocada por #816043
  (`--field-border`), que dá 3.38:1 no fundo e 3.08:1 no card. Os divisores decorativos continuam com #3F2319.
- Os chips de carteira em 9–10px são pequenos. Vale considerar 11px ou mais e registrar o ajuste.

## Ícones e fontes

- **Ícones:** são do Iconly (Curved, Two-tone, Bold, Light-Outline). Opções: `react-iconly`
  (sem atualização desde 2023) ou `lucide-react` (padrão do shadcn), registrando a troca.
- **Fontes:** Roboto Mono 400/500/700 em tudo. Inter 600 aparece só nos títulos e no "Ler mais"
  dos cards do blog. Hospedar localmente via `@fontsource`.
