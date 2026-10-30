// Resolve depois do worker.start(), ou na hora se os mocks estiverem desligados.
// O primeiro render não espera por ela: só o Axios e o socket aguardam.
export const mocksReady: Promise<void> =
  import.meta.env.VITE_ENABLE_MOCKS === 'true'
    ? import('@/mocks/browser').then(({ startMocks }) => startMocks())
    : Promise.resolve()
