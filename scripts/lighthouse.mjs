// Roda o Lighthouse (via LHCI) nos perfis mobile e desktop, 3 vezes por página, em `vite preview`,
// e grava as medianas em lighthouse/SUMMARY.md.
// Uso: npm run lighthouse            (faz o build antes)
//      npm run lighthouse -- mobile  (só um perfil)
// O navegador abre com perfil limpo, então o mock usa o cenário `default` e a seed padrão.
import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'

const profiles = process.argv.slice(2).length ? process.argv.slice(2) : ['mobile', 'desktop']
const categories = ['performance', 'accessibility', 'best-practices', 'seo']
const metrics = [
  ['first-contentful-paint', 'FCP', (v) => `${(v / 1000).toFixed(1)} s`],
  ['largest-contentful-paint', 'LCP', (v) => `${(v / 1000).toFixed(1)} s`],
  ['total-blocking-time', 'TBT', (v) => `${Math.round(v)} ms`],
  ['cumulative-layout-shift', 'CLS', (v) => v.toFixed(3)],
]

const run = (cmd) => {
  const result = spawnSync(cmd, { stdio: 'inherit', shell: true })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

run('npm run build')

const rows = []
let lighthouseVersion = ''
let chromeVersion = ''
for (const profile of profiles) {
  run(`npx lhci collect --config=lighthouserc.${profile}.json`)
  const reports = readdirSync('.lighthouseci')
    .filter((file) => file.startsWith('lhr-') && file.endsWith('.json'))
    .map((file) => JSON.parse(readFileSync(`.lighthouseci/${file}`, 'utf8')))
  lighthouseVersion = reports[0].lighthouseVersion
  chromeVersion = reports[0].environment.hostUserAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? '?'

  const byUrl = Map.groupBy(reports, (lhr) => new URL(lhr.finalDisplayedUrl).pathname)
  for (const [path, lhrs] of byUrl) {
    rows.push({
      profile,
      path,
      runs: lhrs.length,
      scores: categories.map((id) => Math.round(median(lhrs.map((l) => l.categories[id].score)) * 100)),
      metrics: metrics.map(([id, , format]) => format(median(lhrs.map((l) => l.audits[id].numericValue)))),
    })
  }
}

const { version: lhciVersion } = JSON.parse(readFileSync('node_modules/@lhci/cli/package.json', 'utf8'))
const lines = [
  '# Lighthouse — resumo',
  '',
  `Gerado por \`npm run lighthouse\` em ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC.`,
  'Mediana de 3 rodadas por página e por perfil, em `vite preview` (build de produção, mocks ligados,',
  'cenário `default`, perfil do navegador limpo).',
  '',
  '| Perfil | Página | Rodadas | Perf | A11y | Best practices | SEO | FCP | LCP | TBT | CLS |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.profile} | \`${r.path}\` | ${r.runs} | ${[...r.scores, ...r.metrics].join(' | ')} |`),
  '',
  '## Ambiente',
  '',
  `- Lighthouse ${lighthouseVersion}, @lhci/cli ${lhciVersion}, Chrome ${chromeVersion} (headless)`,
  `- Node ${process.version}, ${os.type()} ${os.release()} (${os.arch()}), ${os.cpus()[0].model}, ${Math.round(os.totalmem() / 1024 ** 3)} GB`,
  '- Mobile: emulação padrão do Lighthouse (Moto G Power, 4G lento simulado, CPU 4×).',
  '- Desktop: preset `desktop` (1350×940, sem throttling de CPU, rede cabeada simulada).',
  '',
]
mkdirSync('lighthouse', { recursive: true })
const notesFile = 'lighthouse/NOTES.md'
try {
  lines.push(readFileSync(notesFile, 'utf8'))
} catch {
  // sem notas manuais ainda
}
writeFileSync('lighthouse/SUMMARY.md', lines.join('\n'))
console.log(lines.slice(0, 8 + rows.length).join('\n'))
