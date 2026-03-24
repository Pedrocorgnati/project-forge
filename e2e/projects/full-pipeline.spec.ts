// e2e/projects/full-pipeline.spec.ts
// P045 — E2E: pipeline completo briefing → estimativa → aprovação → board → P&L
// Playwright spec (test.describe com autenticação PM)

import { test, expect } from '../fixtures'

/**
 * Este spec testa o fluxo principal de negócio do ProjectForge:
 *   1. Criar projeto via briefing
 *   2. Gerar e aprovar estimativa
 *   3. Visualizar board de tarefas
 *   4. Registrar horas no timesheet
 *   5. Verificar P&L (rentabilidade)
 *
 * Pré-requisitos de ambiente:
 *   - PM_EMAIL / PM_PASSWORD definidos no .env.test
 *   - Banco de dados de teste com seed
 *   - NEXT_PUBLIC_APP_URL configurado
 */

const PROJECT_NAME = `E2E Pipeline ${Date.now()}`

test.describe('Pipeline completo — Briefing → Estimativa → Aprovação → Board → P&L', () => {
  test.beforeEach(async ({ page }) => {
    // Login como PM
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(process.env.PM_EMAIL ?? 'pm@test.com')
    await page.getByLabel('Senha').fill(process.env.PM_PASSWORD ?? 'senha123')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL('**/dashboard', { timeout: 15000 })
  })

  test('1. Criar projeto via BriefForge AI', async ({ page }) => {
    // Navegar para nova sessão de brief
    await page.goto('/briefforge')
    await expect(page.getByRole('heading', { name: /novo projeto/i })).toBeVisible()

    // Iniciar briefing
    await page.getByRole('button', { name: /iniciar briefing/i }).click()
    await page.waitForURL('**/briefforge/**')

    // Responder primeira pergunta (nome do projeto)
    const answerInput = page.getByRole('textbox')
    await answerInput.fill(PROJECT_NAME)
    await page.getByRole('button', { name: /enviar|próximo/i }).click()

    // Verificar que sessão foi criada e há uma resposta da IA
    await expect(page.locator('[data-testid="ai-message"]').first()).toBeVisible({ timeout: 15000 })
  })

  test('2. Visualizar estimativa do projeto', async ({ page }) => {
    // Assumindo projeto existente no seed
    await page.goto('/projects')
    await expect(page.getByRole('heading', { name: /projetos/i })).toBeVisible()

    // Verificar que lista de projetos renderiza
    const projectList = page.locator('[data-testid="project-card"], table tbody tr')
    await expect(projectList.first()).toBeVisible({ timeout: 10000 })

    // Clicar no primeiro projeto
    await projectList.first().click()
    await page.waitForURL('**/projects/**')

    // Navegar para estimativa
    const estimateLink = page.getByRole('link', { name: /estimativa/i })
    if (await estimateLink.isVisible()) {
      await estimateLink.click()
      await page.waitForURL('**/estimate')
      await expect(page.getByRole('heading', { name: /estimativa/i })).toBeVisible()
    }
  })

  test('3. Board de tarefas renderiza com colunas Kanban', async ({ page }) => {
    await page.goto('/projects')
    const projectRow = page.locator('[data-testid="project-card"], table tbody tr').first()
    await expect(projectRow).toBeVisible({ timeout: 10000 })

    // Navegar para o board do projeto
    const projectId = await projectRow.getAttribute('data-project-id')
    if (projectId) {
      await page.goto(`/projects/${projectId}/board`)
    } else {
      await projectRow.click()
      await page.waitForURL('**/projects/**')
      await page.getByRole('link', { name: /board|tarefas/i }).click()
    }

    // Verificar colunas do Kanban
    await expect(page.getByText(/a fazer|todo/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/em progresso|in progress/i).first()).toBeVisible()
    await expect(page.getByText(/concluído|done/i).first()).toBeVisible()
  })

  test('4. Registrar horas no timesheet', async ({ page }) => {
    await page.goto('/projects')
    const projectRow = page.locator('[data-testid="project-card"], table tbody tr').first()
    await expect(projectRow).toBeVisible({ timeout: 10000 })

    const projectId = await projectRow.getAttribute('data-project-id')
    const timesheetUrl = projectId
      ? `/projects/${projectId}/timesheet`
      : null

    if (!timesheetUrl) {
      test.skip()
      return
    }

    await page.goto(timesheetUrl)
    await expect(page.getByRole('heading', { name: /timesheet|horas/i })).toBeVisible()

    // Abrir modal de lançamento de horas
    await page.getByRole('button', { name: /lançar horas|registrar horas|log hours/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Preencher formulário
    const hoursInput = page.getByLabel(/horas/i)
    await hoursInput.fill('4')

    // Selecionar data de hoje
    const dateInput = page.getByLabel(/data/i)
    const today = new Date().toISOString().split('T')[0]
    await dateInput.fill(today)

    // Submeter
    await page.getByRole('button', { name: /salvar|lançar|confirmar/i }).click()

    // Verificar sucesso (toast ou entry na lista)
    await expect(page.getByText(/4.*hora|hora.*4/i).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('5. Dashboard P&L (rentabilidade) exibe métricas', async ({ page }) => {
    await page.goto('/profitability')
    await expect(page.getByRole('heading', { name: /rentabilidade|p&l|lucro/i })).toBeVisible({
      timeout: 10000,
    })

    // Verificar que cards de métricas existem
    const metricsCards = page.locator('[data-testid="metric-card"], .metric-card, [class*="stat"]')
    const count = await metricsCards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('6. Aprovação — portal do cliente mostra itens pendentes', async ({ page }) => {
    // Navegar para aprovações (como PM vendo lista)
    await page.goto('/projects')
    const projectRow = page.locator('[data-testid="project-card"], table tbody tr').first()
    await expect(projectRow).toBeVisible({ timeout: 10000 })

    const projectId = await projectRow.getAttribute('data-project-id')
    if (!projectId) {
      test.skip()
      return
    }

    await page.goto(`/projects/${projectId}/approvals`)
    await expect(page.getByRole('heading', { name: /aprovações/i })).toBeVisible()

    // Página renderiza sem erros 500
    const errorText = page.getByText(/500|internal server error|erro interno/i)
    await expect(errorText).not.toBeVisible()
  })
})

// ─── Smoke tests de navegação ──────────────────────────────────────────────────

test.describe('Smoke — rotas principais respondem sem erro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(process.env.PM_EMAIL ?? 'pm@test.com')
    await page.getByLabel('Senha').fill(process.env.PM_PASSWORD ?? 'senha123')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL('**/dashboard', { timeout: 15000 })
  })

  const routes = [
    '/dashboard',
    '/projects',
    '/profitability',
    '/configuracoes',
  ]

  for (const route of routes) {
    test(`GET ${route} → 200 sem crash`, async ({ page }) => {
      await page.goto(route)

      // Sem mensagem de erro crítico na tela
      await expect(page.getByText(/500|internal server error/i)).not.toBeVisible()
      await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 })
    })
  }
})
