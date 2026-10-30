// Espelha a superfície de src/mocks/devtools/kurio.ts (o tsconfig dos testes não compila src/).
declare global {
  interface Window {
    __kurio?: {
      emitNftUpdate(nftId: string, change: { priceEth: string }): unknown
      connectedClients(): number
    }
  }
}

export {}
