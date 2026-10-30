// Roda a regressão visual na imagem oficial do Playwright (Linux), onde as baselines foram geradas.
// Uso: npm run test:visual            (compara)
//      npm run test:visual:update     (regenera as baselines)
// Argumentos extras vão para o `playwright test`. Requer Docker.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('node_modules/@playwright/test/package.json', 'utf8'))
const image = `mcr.microsoft.com/playwright:v${version}-noble`
const args = process.argv.slice(2).join(' ')

const result = spawnSync(
  'docker',
  [
    'run', '--rm', '--ipc=host', '--init',
    '-v', `${process.cwd()}:/work`,
    // node_modules próprio do Linux (os binários nativos do host não servem), num volume reaproveitado
    '-v', 'kurio-visual-node-modules:/work/node_modules',
    '-w', '/work',
    image,
    'bash', '-c', `npm ci --no-audit --no-fund && npx playwright test e2e/visual.spec.ts ${args}`,
  ],
  { stdio: 'inherit' },
)
process.exit(result.status ?? 1)
