import { test as setup } from '@playwright/test'

const authFile = (role: string) => `e2e/.auth/${role}.json`

/**
 * Setup: criar sessões autenticadas por role usando storageState.
 * OAuth GitHub não pode ser testado automaticamente — usar email+senha para todos os roles.
 * CLIENTE usa MFA via TOTP seed armazenado em .env.test.
 */

setup('authenticate as SOCIO', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(process.env.TEST_SOCIO_EMAIL!)
  await page.getByLabel('Senha').fill(process.env.TEST_SOCIO_PASSWORD!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL('**/dashboard', { timeout: 10000 })
  await page.context().storageState({ path: authFile('socio') })
})

setup('authenticate as PM', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(process.env.TEST_PM_EMAIL!)
  await page.getByLabel('Senha').fill(process.env.TEST_PM_PASSWORD!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL('**/dashboard', { timeout: 10000 })
  await page.context().storageState({ path: authFile('pm') })
})

setup('authenticate as DEV', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(process.env.TEST_DEV_EMAIL!)
  await page.getByLabel('Senha').fill(process.env.TEST_DEV_PASSWORD!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL('**/dashboard', { timeout: 10000 })
  await page.context().storageState({ path: authFile('dev') })
})

setup('authenticate as CLIENTE (com MFA)', async ({ page }) => {
  await page.goto('/login')
  // Selecionar tab do portal cliente, se existir
  const clienteTab = page.getByRole('tab', { name: /portal do cliente/i })
  if (await clienteTab.isVisible()) {
    await clienteTab.click()
  }
  await page.getByLabel('E-mail').fill(process.env.TEST_CLIENTE_EMAIL!)
  await page.getByLabel('Senha').fill(process.env.TEST_CLIENTE_PASSWORD!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL('**/mfa/verify', { timeout: 10000 })

  // Gerar código TOTP a partir do seed de teste
  const { generateTOTP } = await import('../utils/totp')
  const code = generateTOTP(process.env.TEST_CLIENTE_MFA_SEED!)
  await page.getByLabel(/código de verificação/i).fill(code)
  await page.waitForURL('**/portal', { timeout: 10000 })
  await page.context().storageState({ path: authFile('cliente') })
})
