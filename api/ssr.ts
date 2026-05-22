import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { default: app } = await import('../dist/server/server.js' as string)

  const protocol = req.headers['x-forwarded-proto'] ?? 'https'
  const host = req.headers['x-forwarded-host'] ?? req.headers.host
  const url = `${protocol}://${host}${req.url}`

  const request = new Request(url, {
    method: req.method,
    headers: req.headers as HeadersInit,
    body:
      req.method !== 'GET' && req.method !== 'HEAD'
        ? JSON.stringify(req.body)
        : undefined,
  })

  const response = await app.fetch(request)

  res.status(response.status)
  for (const [key, value] of response.headers.entries()) {
    res.setHeader(key, value)
  }

  const buffer = await response.arrayBuffer()
  res.send(Buffer.from(buffer))
}
