// Senhas do mock com PBKDF2 (WebCrypto). Nunca ficam em claro no banco nem no localStorage.
const ITERATIONS = 100_000

const toHex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')

const fromHex = (hex: string) => Uint8Array.from(hex.match(/../g) ?? [], (pair) => parseInt(pair, 16))

export async function hashPassword(password: string, saltHex: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: ITERATIONS },
    key,
    256,
  )
  return toHex(bits)
}

export function newSalt() {
  return toHex(crypto.getRandomValues(new Uint8Array(16)))
}

export async function verifyPassword(password: string, saltHex: string, expectedHex: string) {
  return (await hashPassword(password, saltHex)) === expectedHex
}
