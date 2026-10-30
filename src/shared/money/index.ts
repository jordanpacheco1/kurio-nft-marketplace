// ETH trafega como string decimal e é calculado em bigint (wei, 18 casas). Nada passa por number.
// Sem alias `@/`: os mocks e os testes do Playwright importam este módulo.

const DECIMALS = 18
const WEI_PER_ETH = 10n ** BigInt(DECIMALS)
const ETH_PATTERN = /^(\d+)(?:\.(\d{1,18}))?$/

export function toWei(eth: string): bigint {
  const match = ETH_PATTERN.exec(eth.trim())
  if (!match) throw new RangeError(`Valor em ETH inválido: "${eth}"`)
  const [, whole = '0', fraction = ''] = match
  return BigInt(whole) * WEI_PER_ETH + BigInt(fraction.padEnd(DECIMALS, '0'))
}

/** Forma canônica: sem zeros à direita e sem ponto se for inteiro (`1.5`, `2`, `0.016`). */
export function fromWei(wei: bigint): string {
  if (wei < 0n) throw new RangeError('Valor negativo em ETH')
  const whole = wei / WEI_PER_ETH
  const fraction = (wei % WEI_PER_ETH).toString().padStart(DECIMALS, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

export function addEth(...values: string[]): string {
  return fromWei(values.reduce((sum, value) => sum + toWei(value), 0n))
}

/** `a - b`; nunca negativo (o resultado é limitado a zero). */
export function subEth(a: string, b: string): string {
  const diff = toWei(a) - toWei(b)
  return fromWei(diff > 0n ? diff : 0n)
}

export function mulEth(value: string, quantity: number): string {
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new RangeError('A quantidade precisa ser um inteiro ≥ 0')
  return fromWei(toWei(value) * BigInt(quantity))
}

/**
 * Percentual inteiro de um valor. Arredonda para baixo no wei: o desconto nunca passa do
 * percentual anunciado (10% de 0.000000000000000019 ETH = 0.000000000000000001).
 */
export function percentOf(value: string, percent: number): string {
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) throw new RangeError('Percentual inválido')
  return fromWei((toWei(value) * BigInt(percent)) / 100n)
}

export function compareEth(a: string, b: string): -1 | 0 | 1 {
  const diff = toWei(a) - toWei(b)
  return diff === 0n ? 0 : diff > 0n ? 1 : -1
}

type FormatOptions = { minDecimals?: number; maxDecimals?: number; unit?: boolean }

/**
 * Formatação para exibição: `1.19 ETH`, `0.016 ETH`, `2.50 ETH`.
 * Arredonda meio para cima em `maxDecimals` (padrão 4) e completa até `minDecimals` (padrão 2).
 * Usa ponto decimal, como o Figma.
 */
export function formatEth(value: string, { minDecimals = 2, maxDecimals = 4, unit = true }: FormatOptions = {}) {
  const step = 10n ** BigInt(DECIMALS - maxDecimals)
  const wei = toWei(value)
  const rounded = ((wei + step / 2n) / step) * step
  const [whole, fraction = ''] = fromWei(rounded).split('.')
  const digits = fraction.padEnd(minDecimals, '0')
  const text = digits ? `${whole}.${digits}` : `${whole}`
  return unit ? `${text} ETH` : text
}
