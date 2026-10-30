import { Link, useNavigate } from '@tanstack/react-router'
import { cn } from 'cn'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { LoginForm, RegisterForm } from '@/features/auth/components/auth-forms'
import { safeRedirect } from '@/features/auth/queries'
import { HomeHero } from '@/features/catalog/components/home-hero'
import { DESKTOP_QUERY, useMediaQuery } from '@/shared/ui/use-media-query'

export type AuthMode = 'login' | 'register'
export type AuthSearch = { redirect?: string; reason?: 'expired' }

// Rotas que exigem sessão: fechar o login não pode voltar para elas (o guard mandaria de novo ao login).
const PROTECTED = ['/checkout', '/perfil', '/pedidos']

const COPY = {
  login: {
    title: 'Entrar',
    mobileTitle: 'Entrar',
    description: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  },
  register: {
    title: 'Criar conta',
    mobileTitle: 'Criar perfil de colecionador',
    description: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
  },
} as const

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.94 10.94 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path fill="#1877F2" d="M14 8.5V6.6c0-.9.6-1.1 1-1.1h2.6V1.5L14 1.5c-4 0-4.9 3-4.9 4.9v2.1H6.8v4.1h2.3V23H14V12.6h3.3l.4-4.1H14Z" />
    </svg>
  )
}

/** Login social fica fora do escopo: visível como no Figma, mas desabilitado e marcado "Em breve". */
function SocialLogin({ className }: { className?: string }) {
  const button =
    'flex h-10 w-full cursor-not-allowed items-center justify-center gap-3 rounded-[5px] border border-border text-caption text-fg-secondary opacity-80'
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <p className="flex items-center gap-3 text-caption text-fg before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        Ou continue com
      </p>
      <button type="button" disabled title="Em breve" className={button}>
        <GoogleIcon /> Continuar com Google <span className="sr-only">(em breve)</span>
      </button>
      <button type="button" disabled title="Em breve" className={button}>
        <FacebookIcon /> Continuar com Facebook <span className="sr-only">(em breve)</span>
      </button>
    </div>
  )
}

function ExpiredNotice({ search }: { search: AuthSearch }) {
  if (search.reason !== 'expired') return null
  return (
    <p role="alert" className="rounded-[5px] border border-copper/60 bg-copper/10 px-3 py-2 text-caption text-fg">
      Sua sessão expirou. Entre de novo para continuar de onde parou.
    </p>
  )
}

/**
 * Login e cadastro. A partir de 1024 px abrem como dialog sobre a home (como no Figma);
 * abaixo disso são uma página com o logo grande. Depois de entrar, volta para `redirect`.
 */
export function AuthScreen({ mode, search }: { mode: AuthMode; search: AuthSearch }) {
  const navigate = useNavigate()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const target = safeRedirect(search.redirect)
  const copy = COPY[mode]

  const done = () => void navigate({ href: target, replace: true })
  const close = () => {
    const isProtected = PROTECTED.some((prefix) => target.startsWith(prefix))
    void navigate({ href: isProtected ? '/' : target, replace: true })
  }

  const form =
    mode === 'login' ? (
      <LoginForm onSuccess={done} />
    ) : (
      <RegisterForm onSuccess={done} submitLabel={isDesktop ? 'Criar conta' : 'Criar perfil'} />
    )

  if (isDesktop) {
    const tab = 'rounded-sm px-1 hover:text-copper-text focus-visible:outline-2 focus-visible:outline-copper'
    return (
      <>
        <div inert aria-hidden="true" className="page-container pt-4">
          <HomeHero />
        </div>
        <Dialog open onOpenChange={(open) => !open && close()}>
          <DialogContent
            aria-describedby="auth-description"
            className="top-[160px] max-w-[500px] translate-y-0 gap-0 rounded-none border-0 border-b-[10px] border-b-copper bg-surface p-0 pt-12 pb-16 sm:max-w-[500px] [&>button:last-child]:text-copper-text"
          >
            <DialogTitle className="sr-only">{copy.title}</DialogTitle>
            <nav aria-label="Conta" className="flex items-center justify-center gap-2 text-tab font-medium text-fg">
              <Link to="/login" search={search} replace aria-current={mode === 'login' ? 'page' : undefined} className={cn(tab, mode === 'login' && 'text-copper-text')}>
                Entrar
              </Link>
              <span aria-hidden="true" className="h-5 w-px bg-copper" />
              <Link to="/cadastro" search={search} replace aria-current={mode === 'register' ? 'page' : undefined} className={cn(tab, mode === 'register' && 'text-copper-text')}>
                Criar conta
              </Link>
            </nav>
            <DialogDescription id="auth-description" className="mx-auto mt-12 max-w-[400px] text-center text-caption text-fg">
              {copy.description}
            </DialogDescription>
            <div className="mx-auto mt-6 flex w-[340px] flex-col gap-3">
              <ExpiredNotice search={search} />
              {form}
            </div>
            <SocialLogin className="mx-auto mt-4 w-full [&>button]:mx-auto [&>button]:w-[340px]" />
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <section aria-labelledby="auth-title" className="mx-auto flex w-full max-w-md flex-col px-7 pt-24 pb-10">
      <Link to="/" className="mx-auto text-[2rem] font-bold tracking-[0.15em] text-fg">
        KURIO
      </Link>
      <h1 id="auth-title" className="mt-24 text-center text-tab font-bold text-fg">
        {copy.mobileTitle}
      </h1>
      <p className="sr-only">{copy.description}</p>
      <div className="mt-10 flex flex-col gap-3">
        <ExpiredNotice search={search} />
        {form}
      </div>
      <SocialLogin className="mt-10" />
      <p className="mt-12 text-center text-body text-fg-secondary">
        {mode === 'login' ? (
          <>
            Novo na Kurio?{' '}
            <Link to="/cadastro" search={search} replace className="hover:text-copper-text">
              Crie uma conta
            </Link>
          </>
        ) : (
          <>
            Já tem uma conta?{' '}
            <Link to="/login" search={search} replace className="hover:text-copper-text">
              Entre
            </Link>
          </>
        )}
      </p>
    </section>
  )
}
