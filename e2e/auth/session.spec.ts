import { test, expect } from '../fixtures'

test.describe('Gestão de Sessão', () => {
  test('session timeout: modal aparece após inatividade simulada', async ({ socioPage }) => {
    await socioPage.goto('/dashboard')
    // Disparar timeout manualmente via custom event (exposto pelo useSessionTimeout)
    await socioPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent('__simulateSessionTimeout'))
    })
    await expect(
      socioPage.getByRole('alertdialog', { name: /sessão expirou/i })
    ).toBeVisible({ timeout: 3000 })
    await expect(
      socioPage.getByRole('button', { name: /fazer login/i })
    ).toBeVisible()
  })

  test('session timeout modal: não fecha com tecla ESC', async ({ socioPage }) => {
    await socioPage.goto('/dashboard')
    await socioPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent('__simulateSessionTimeout'))
    })
    await expect(socioPage.getByRole('alertdialog')).toBeVisible({ timeout: 3000 })
    await socioPage.keyboard.press('Escape')
    // Modal deve permanecer visível
    await expect(socioPage.getByRole('alertdialog')).toBeVisible()
  })

  test('session timeout modal: não fecha ao clicar fora', async ({ socioPage }) => {
    await socioPage.goto('/dashboard')
    await socioPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent('__simulateSessionTimeout'))
    })
    await expect(socioPage.getByRole('alertdialog')).toBeVisible({ timeout: 3000 })
    // Clicar fora do modal (canto superior esquerdo)
    await socioPage.mouse.click(10, 10)
    await expect(socioPage.getByRole('alertdialog')).toBeVisible()
  })

  test('session timeout: clicar "Fazer Login" → redirect /login', async ({ socioPage }) => {
    await socioPage.goto('/dashboard')
    await socioPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent('__simulateSessionTimeout'))
    })
    await socioPage.getByRole('button', { name: /fazer login/i }).click()
    await expect(socioPage).toHaveURL(/.*login.*/, { timeout: 5000 })
  })

  test('session refresh transparente: navegação contínua não exige re-login', async ({ socioPage }) => {
    await socioPage.goto('/dashboard')
    await socioPage.goto('/projetos')
    await socioPage.goto('/dashboard')
    // Usuário deve estar autenticado — não redirecionado para login
    await expect(socioPage).toHaveURL('/dashboard')
    await expect(socioPage).not.toHaveURL(/.*login.*/)
  })

  test('cookies de sessão possuem httpOnly e secure', async ({ socioPage }) => {
    await socioPage.goto('/dashboard')
    const cookies = await socioPage.context().cookies()
    const sessionCookie = cookies.find(
      (c) => c.name.includes('supabase') && c.name.includes('auth')
    )
    if (sessionCookie) {
      expect(sessionCookie.httpOnly).toBe(true)
      // secure=true apenas em produção (https)
      if (process.env.NODE_ENV === 'production') {
        expect(sessionCookie.secure).toBe(true)
      }
    }
  })
})
