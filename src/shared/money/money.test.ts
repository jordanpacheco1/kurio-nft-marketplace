import { describe, expect, it } from 'vitest'
import { addEth, compareEth, formatEth, fromWei, mulEth, percentOf, subEth, toWei } from './index'

describe('toWei / fromWei', () => {
  it('converte ida e volta sem perder precisão', () => {
    for (const value of ['0', '1', '1.19', '0.016', '12.3', '0.000000000000000001', '123456789.123456789123456789']) {
      expect(fromWei(toWei(value))).toBe(value)
    }
  })

  it('normaliza zeros à direita', () => {
    expect(fromWei(toWei('2.50'))).toBe('2.5')
    expect(fromWei(toWei('3.000'))).toBe('3')
  })

  it('recusa formatos inválidos', () => {
    for (const value of ['', '-1', '1,5', '1.', '.5', 'abc', '1.0000000000000000001']) {
      expect(() => toWei(value)).toThrow(RangeError)
    }
  })

  it('evita o erro clássico do ponto flutuante', () => {
    expect(addEth('0.1', '0.2')).toBe('0.3')
  })
})

describe('aritmética', () => {
  it('soma vários valores', () => {
    expect(addEth('1.19', '1.69', '1.99')).toBe('4.87')
    expect(addEth()).toBe('0')
  })

  it('multiplica por inteiro', () => {
    expect(mulEth('1.19', 3)).toBe('3.57')
    expect(mulEth('0.016', 0)).toBe('0')
    expect(() => mulEth('1', 1.5)).toThrow(RangeError)
    expect(() => mulEth('1', -1)).toThrow(RangeError)
  })

  it('subtrai sem ficar negativo', () => {
    expect(subEth('4.87', '0.487')).toBe('4.383')
    expect(subEth('1', '2')).toBe('0')
  })

  it('compara', () => {
    expect(compareEth('1.2', '1.19')).toBe(1)
    expect(compareEth('1.10', '1.1')).toBe(0)
    expect(compareEth('0.02', '12.3')).toBe(-1)
  })
})

describe('percentOf', () => {
  it('calcula percentuais exatos', () => {
    expect(percentOf('4.87', 10)).toBe('0.487')
    expect(percentOf('1.19', 5)).toBe('0.0595')
    expect(percentOf('3', 100)).toBe('3')
    expect(percentOf('3', 0)).toBe('0')
  })

  it('arredonda para baixo no wei', () => {
    expect(percentOf('0.000000000000000019', 10)).toBe('0.000000000000000001')
    expect(percentOf('0.000000000000000009', 10)).toBe('0')
  })

  it('recusa percentual fora de 0–100 ou fracionário', () => {
    expect(() => percentOf('1', 101)).toThrow(RangeError)
    expect(() => percentOf('1', 2.5)).toThrow(RangeError)
  })
})

describe('formatEth', () => {
  it('completa até 2 casas e corta em 4', () => {
    expect(formatEth('1.19')).toBe('1.19 ETH')
    expect(formatEth('2.5')).toBe('2.50 ETH')
    expect(formatEth('3')).toBe('3.00 ETH')
    expect(formatEth('0.016')).toBe('0.016 ETH')
    expect(formatEth('0.0595')).toBe('0.0595 ETH')
  })

  it('arredonda meio para cima na última casa exibida', () => {
    expect(formatEth('1.23455')).toBe('1.2346 ETH')
    expect(formatEth('1.23444')).toBe('1.2344 ETH')
    expect(formatEth('0.99999')).toBe('1.00 ETH')
  })

  it('aceita opções', () => {
    expect(formatEth('1.19', { unit: false })).toBe('1.19')
    expect(formatEth('8.14', { minDecimals: 0, maxDecimals: 1 })).toBe('8.1 ETH')
  })
})
