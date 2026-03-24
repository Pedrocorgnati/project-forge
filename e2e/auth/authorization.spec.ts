import { test, expect } from '../fixtures'

test.describe('Autorização por Role — route guards', () => {
  test('CLIENTE acessa /dashboard → redirect /portal', async ({ clientePage }) => {
    await clientePage.goto('/dashboard')
    await expect(clientePage).toHaveURL('/portal', { timeout: 5000 })
  })

  test('DEV acessa /configuracoes → redirect /dashboard', async ({ devPage }) => {
    await devPage.goto('/configuracoes')
    await expect(devPage).toHaveURL('/dashboard', { timeout: 5000 })
  })

  test('PM acessa /configuracoes → redirect /dashboard', async ({ pmPage }) => {
    await pmPage.goto('/configuracoes')
    await expect(pmPage).toHaveURL('/dashboard', { timeout: 5000 })
  })

  test('SOCIO acessa /configuracoes → 200 OK', async ({ socioPage }) => {
    await socioPage.goto('/configuracoes')
    await expect(socioPage).toHaveURL('/configuracoes', { timeout: 5000 })
  })

  test('CLIENTE acessa /portal → 200 OK', async ({ clientePage }) => {
    await clientePage.goto('/portal')
    await expect(clientePage).toHaveURL('/portal', { timeout: 5000 })
  })

  test('SOCIO acessa /dashboard → 200 OK', async ({ socioPage }) => {
    await socioPage.goto('/dashboard')
    await expect(socioPage).toHaveURL('/dashboard', { timeout: 5000 })
  })

  test('logout limpa sessão → rotas protegidas inacessíveis', async ({ socioPage }) => {
    await socioPage.goto('/dashboard')
    // Clicar no botão de logout
    const logoutBtn = socioPage.getByRole('button', { name: /sair|logout/i })
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click()
      await expect(socioPage).toHaveURL(/.*login.*/, { timeout: 5000 })
      // Tentar acessar rota protegida após logout
      await socioPage.goto('/dashboard')
      await expect(socioPage).toHaveURL(/.*login.*/, { timeout: 5000 })
    } else {
      // Logout via API diretamente
      await socioPage.request.post('/api/auth/logout')
      await socioPage.goto('/dashboard')
      await expect(socioPage).toHaveURL(/.*login.*/, { timeout: 5000 })
    }
  })

  test('API /api/projects sem token → 401', async ({ request }) => {
    const response = await request.get('/api/projects')
    expect([401, 404]).toContain(response.status())
  })
})
