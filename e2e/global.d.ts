// Espelha a superfície de src/mocks/devtools/kurio.ts (o tsconfig dos testes não compila src/mocks).
type NftChange = { editionId?: string; priceEth?: string; available?: number }

declare global {
  interface Window {
    __kurio?: {
      reset(scenario?: string, seed?: number): void
      setScenario(id: string, seed?: number): void
      getScenario(): string
      scenarios(): string[]
      setLatency(ms: number | null): void
      failNext(method: string, pattern: string, code?: string): void
      emitNftUpdate(nftId: string, change: NftChange): unknown
      emitDuplicates(nftId: string, change: NftChange): unknown
      dropSocket(ms?: number): void
      expireSession(): void
      connectedClients(): number
    }
  }
}

export {}
