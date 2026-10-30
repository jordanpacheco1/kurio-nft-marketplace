# Kurio

Marketplace de NFTs do desafio frontend da Jungle Gaming. (Setup, cenários e comandos completos entram na Fase 8.)

## Testes

```bash
npm run test:e2e            # E2E nos projetos desktop (1440 px) e mobile (390 px)
npm run test:visual         # regressão visual no Docker (imagem oficial do Playwright)
npm run test:visual:update  # regenera as baselines no Docker
```

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
