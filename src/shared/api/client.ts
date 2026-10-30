import axios from 'axios'
import { mocksReady } from '@/app/boot'

export const api = axios.create({ baseURL: '/api' })

// Nenhuma requisição sai antes do service worker do MSW estar ativo.
api.interceptors.request.use(async (config) => {
  await mocksReady
  return config
})
