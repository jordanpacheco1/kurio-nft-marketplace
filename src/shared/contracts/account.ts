import { z } from 'zod'
import {
  emailSchema,
  ensNameSchema,
  isoDateSchema,
  networkSchema,
  passwordSchema,
  usernameSchema,
  walletAddressSchema,
} from './common'

// ----- Sessão -----

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
})
export type User = z.infer<typeof userSchema>

export const sessionSchema = z.object({
  token: z.string(),
  user: userSchema,
  expiresAt: isoDateSchema,
})
export type Session = z.infer<typeof sessionSchema>

/** `GET /auth/session`: o token não volta, o cliente já o tem. */
export const currentSessionSchema = sessionSchema.omit({ token: true })
export type CurrentSession = z.infer<typeof currentSessionSchema>

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe a senha'),
})
export type LoginInput = z.infer<typeof loginInputSchema>

export const registerInputSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
})
export type RegisterInput = z.infer<typeof registerInputSchema>

// ----- Perfil -----

export const profileSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  username: z.string(),
  email: z.string(),
  ensName: z.string().nullable(),
  walletNickname: z.string().nullable(),
  avatarUrl: z.string().nullable(),
})
export type Profile = z.infer<typeof profileSchema>

export const profileUpdateSchema = z
  .object({
    displayName: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(40, 'Máximo de 40 caracteres'),
    username: usernameSchema,
    email: emailSchema,
    ensName: ensNameSchema.nullable(),
    walletNickname: z.string().trim().max(30, 'Máximo de 30 caracteres').nullable(),
  })
  .partial()
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>

/** Avatar já redimensionado no cliente (256 px). Limite de ~200 kB na data URL. */
export const avatarInputSchema = z.object({
  dataUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,/, 'Use uma imagem PNG, JPEG ou WebP')
    .max(200_000, 'A imagem passou de 200 kB'),
})
export type AvatarInput = z.infer<typeof avatarInputSchema>

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: passwordSchema,
})
export type PasswordChange = z.infer<typeof passwordChangeSchema>

// ----- Carteiras -----

export const walletProviderSchema = z.enum(['metamask', 'walletconnect', 'coinbase'])
export type WalletProvider = z.infer<typeof walletProviderSchema>

export const WALLET_PROVIDER_LABELS: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

export const walletSlotSchema = z.enum(['primary', 'secondary'])
export type WalletSlot = z.infer<typeof walletSlotSchema>

export const walletSchema = z.object({
  id: z.string(),
  slot: walletSlotSchema,
  label: z.string(),
  address: z.string(),
  network: networkSchema,
  provider: walletProviderSchema,
  updatedAt: isoDateSchema,
})
export type Wallet = z.infer<typeof walletSchema>

export const walletListSchema = z.object({ items: z.array(walletSchema) })
export type WalletList = z.infer<typeof walletListSchema>

export const walletInputSchema = z.object({
  slot: walletSlotSchema,
  label: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(30, 'Máximo de 30 caracteres'),
  address: walletAddressSchema,
  network: networkSchema,
  provider: walletProviderSchema,
})
export type WalletInput = z.infer<typeof walletInputSchema>

export const walletUpdateSchema = walletInputSchema.omit({ slot: true }).partial()
export type WalletUpdate = z.infer<typeof walletUpdateSchema>

export const walletSessionInputSchema = z.object({ walletId: z.string(), network: networkSchema })
export type WalletSessionInput = z.infer<typeof walletSessionInputSchema>

export const walletSessionSchema = z.object({
  id: z.string(),
  walletId: z.string(),
  network: networkSchema,
  connectedAt: isoDateSchema,
})
export type WalletSession = z.infer<typeof walletSessionSchema>
