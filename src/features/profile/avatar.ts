/** Lado do avatar salvo, em px. */
export const AVATAR_SIZE = 256

/**
 * Corta o centro da imagem num quadrado de 256 px e devolve uma data URL (WebP, ou JPEG
 * se o navegador não gerar WebP). O servidor simulado guarda a data URL como está.
 */
export async function resizeAvatar(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Não foi possível ler esta imagem.')
  }
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const context = canvas.getContext('2d')!
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
  bitmap.close()
  const webp = canvas.toDataURL('image/webp', 0.85)
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85)
}
