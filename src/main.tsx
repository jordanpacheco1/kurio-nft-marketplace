import '@fontsource-variable/roboto-mono'
import '@fontsource/inter/600.css'
import '@/styles/theme.css'
import '@/app/boot' // dispara o worker do MSW sem bloquear o render
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { queryClient } from '@/app/query-client'
import { RealtimeBridge } from '@/app/realtime-bridge'
import { router } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import { LiveRegion } from '@/shared/ui/live-region'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <RealtimeBridge />
      <LiveRegion />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
)
