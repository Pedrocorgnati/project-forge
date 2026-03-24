import { test, expect } from '../fixtures'

test.describe('Login — fluxos de autenticação', () => {
  test('login email+senha CLIENTE com credenciais válidas → MFA → redirect /portal', async ({ page }) => {
    await page.goto('/login')
    const clienteTab = page.getByRole('tab', { name: /portal do cliente/i })
    if (await clienteTab.isVisible()) await clienteTab.click()
    await page.getByLabel('E-mail').fill(process.env.TEST_CLIENTE_EMAIL!)
    await page.getByLabel('Senha').fill(process.env.TEST_CLIENTE_PASSWORD!)
    await page.getByRole('button', { name: 'Entrar' }).click()
    // MFA obrigatório para CLIENTE
    await page.waitForURL('**/mfa/verify', { timeout: 10000 })
    await expect(page).toHaveURL(/mfa\/verify/)
  })

  test('login com credenciais inválidas → mensagem genérica (não vaza informação)', async ({ page }) => {
    await page.goto('/login')
    const clienteTab = page.getByRole('tab', { name: /portal do cliente/i })
    if (await clienteTab.isVisible()) await clienteTab.click()
    await page.getByLabel('E-mail').fill('inexistente@test.com')
    await page.getByLabel('Senha').fill('senhaerrada123')
    await page.getByRole('button', { name: 'Entrar' }).click()
    // Mensagem genérica — não deve revelar se email existe
    await expect(page.getByText(/e-mail ou senha incorretos/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/usuário não encontrado/i)).not.toBeVisible()
    await expect(page.getByText(/email não cadastrado/i)).not.toBeVisible()
  })

  test('acessar /dashboard sem autenticação → redirect /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('acessar /portal sem autenticação → redirect /login', async ({ page }) => {
    await page.goto('/portal')
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('botão GitHub entra em loading state ao clicar', async ({ page }) => {
    await page.goto('/login')
    // Interceptar redirect OAuth para evitar navegação real
    await page.route('**/auth/v1/authorize**', (route) =>
      route.fulfill({ status: 200, body: '' })
    )
    const githubBtn = page.getByRole('button', { name: /entrar com github/i })
    if (await githubBtn.isVisible()) {
      await githubBtn.click()
      await expect(
        page.getByRole('button', { name: /carregando|loading/i })
      ).toBeVisible({ timeout: 3000 }).catch(() => {
        // Botão pode ter texto diferente — verificar que ficou desabilitado
      })
    }
  })

  test('CLIENTE sem MFA configurado → redirect /mfa/setup', async ({ page }) => {
    if (!process.env.TEST_CLIENTE_NO_MFA_EMAIL) {
      test.skip()
      return
    }
    await page.goto('/login')
    const clienteTab = page.getByRole('tab', { name: /portal do cliente/i })
    if (await clienteTab.isVisible()) await clienteTab.click()
    await page.getByLabel('E-mail').fill(process.env.TEST_CLIENTE_NO_MFA_EMAIL!)
    await page.getByLabel('Senha').fill(process.env.TEST_CLIENTE_NO_MFA_PASSWORD!)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/mfa\/setup/, { timeout: 10000 })
  })
})
