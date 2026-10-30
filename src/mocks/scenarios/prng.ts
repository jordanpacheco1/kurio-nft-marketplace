/** mulberry32: PRNG pequeno e determinístico. Mesma seed, mesma sequência. */
export function createPrng(seed: number) {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]) => items[Math.floor(next() * items.length)] as T,
    chance: (probability: number) => next() < probability,
    hex: (length: number) => Array.from({ length }, () => Math.floor(next() * 16).toString(16)).join(''),
  }
}

export type Prng = ReturnType<typeof createPrng>
