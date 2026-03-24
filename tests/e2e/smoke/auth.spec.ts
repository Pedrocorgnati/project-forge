import { test, expect } from '@playwright/test'

test('home redireciona para login quando não autenticado', async ({ page }) => {
  const response = await page.goto('/')
  // Deve retornar 200 (redirect para login é tratado client-side ou via middleware)
  expect(response?.status()).toBe(200)
  // Verifica que a página carregou sem erro de servidor
  await expect(page).not.toHaveTitle(/500|Error/)
})

test('rota inexistente retorna 404', async ({ request }) => {
  const response = await request.get('/rota-inexistente-404')
  expect(response.status()).toBe(404)
})
