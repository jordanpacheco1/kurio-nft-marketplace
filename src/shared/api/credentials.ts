// Credenciais do cliente no localStorage. Em produção o token seria um cookie httpOnly (ver ARCHITECTURE.md).
const TOKEN_KEY = 'kurio.token'
const CART_ID_KEY = 'kurio.cartId'

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Sem storage: a sessão vale só até o refresh.
  }
}

let memoryCartId: string | null = null
const tokenListeners = new Set<() => void>()

export const getToken = () => read(TOKEN_KEY)

/** Grava (ou apaga) o token e avisa quem depende da sessão (hooks e socket). */
export function setToken(token: string | null) {
  write(TOKEN_KEY, token)
  tokenListeners.forEach((notify) => notify())
}

export function subscribeToken(listener: () => void) {
  tokenListeners.add(listener)
  // Outra aba entrou ou saiu.
  const onStorage = (event: StorageEvent) => {
    if (event.key === TOKEN_KEY) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    tokenListeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** Id do carrinho de visitante (header `X-Cart-Id`). Criado na primeira leitura. */
export function getGuestCartId() {
  let id = read(CART_ID_KEY) ?? memoryCartId
  if (!id) {
    id = crypto.randomUUID()
    write(CART_ID_KEY, id)
  }
  memoryCartId = id
  return id
}

/** Depois do merge no login, o visitante ganha um carrinho novo e vazio. */
export function rotateGuestCartId() {
  memoryCartId = null
  write(CART_ID_KEY, null)
}
