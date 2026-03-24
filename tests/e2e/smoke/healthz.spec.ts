import { test, expect } from '@playwright/test'

test('GET /api/healthz retorna 200', async ({ request }) => {
  const response = await request.get('/api/healthz')
  expect(response.status()).toBe(200)

  const body = await response.json()
  expect(body.status).toBe('ok')
  expect(body.db).toBe('connected')
  expect(body.timestamp).toBeTruthy()
})
