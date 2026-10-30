import { NETWORK_LABELS, type Quote } from '@/shared/contracts'
import { compareEth, formatEth } from '@/shared/money'

/**
 * O que mudou entre a cotação que o usuário viu e a atual (preço, quantidade, itens, cupom, taxa).
 * Lista vazia: mesmos valores, mesmo que o `quoteId` seja outro.
 */
export function quoteChanges(seen: Quote, current: Quote): string[] {
  const changes: string[] = []
  const label = (line: Quote['lines'][number]) => `${line.name} (${line.editionLabel})`

  for (const line of current.lines) {
    const before = seen.lines.find((item) => item.itemId === line.itemId)
    if (!before) {
      changes.push(`${label(line)} entrou na compra.`)
      continue
    }
    if (compareEth(before.unitPriceEth, line.unitPriceEth) !== 0) {
      changes.push(`O preço de ${label(line)} mudou de ${formatEth(before.unitPriceEth)} para ${formatEth(line.unitPriceEth)}.`)
    }
    if (before.quantity !== line.quantity) {
      changes.push(`A quantidade de ${label(line)} mudou de ${before.quantity} para ${line.quantity}.`)
    }
  }
  for (const line of seen.lines) {
    if (!current.lines.some((item) => item.itemId === line.itemId)) changes.push(`${label(line)} saiu da compra.`)
  }
  if (seen.coupon?.code !== current.coupon?.code) {
    changes.push(current.coupon ? `Cupom ${current.coupon.code} aplicado.` : `O cupom ${seen.coupon?.code} não vale mais.`)
  }
  if (seen.network === current.network && compareEth(seen.networkFeeEth, current.networkFeeEth) !== 0) {
    changes.push(`A taxa de rede (${NETWORK_LABELS[current.network]}) mudou para ${formatEth(current.networkFeeEth)}.`)
  }
  if (changes.length && compareEth(seen.totalEth, current.totalEth) !== 0) {
    changes.push(`Total: de ${formatEth(seen.totalEth)} para ${formatEth(current.totalEth)}.`)
  }
  return changes
}
