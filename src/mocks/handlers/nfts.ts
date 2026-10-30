import { http, HttpResponse } from 'msw'
import { nfts } from '@/mocks/db/nfts'

const PAGE_SIZE = 9

export const nftHandlers = [
  http.get('/api/nfts', ({ request }) => {
    const page = Math.max(1, Number(new URL(request.url).searchParams.get('page') ?? 1))
    const start = (page - 1) * PAGE_SIZE
    return HttpResponse.json({
      items: nfts.slice(start, start + PAGE_SIZE),
      page,
      pageSize: PAGE_SIZE,
      total: nfts.length,
      totalPages: Math.max(1, Math.ceil(nfts.length / PAGE_SIZE)),
    })
  }),
]
